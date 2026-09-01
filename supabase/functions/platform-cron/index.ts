import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/auth.ts";
import { getServiceClient } from "../_shared/moneyfusion.ts";

async function sendFcm(token: string, title: string, body: string): Promise<boolean> {
  const serverKey = Deno.env.get("FCM_SERVER_KEY");
  if (!serverKey) return false;

  const res = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${serverKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: token,
      notification: { title, body },
      priority: "high",
    }),
  });

  return res.ok;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("X-Cron-Secret");
  if (!cronSecret || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = getServiceClient();
    const results = { pushSent: 0, pushFailed: 0, renewalReminders: 0 };

    const { data: queue } = await supabase
      .from("push_queue")
      .select("id, user_id, title, body")
      .eq("processed", false)
      .order("created_at", { ascending: true })
      .limit(100);

    for (const item of queue ?? []) {
      const { data: devices } = await supabase
        .from("push_devices")
        .select("token")
        .eq("user_id", item.user_id);

      let sent = false;
      for (const device of devices ?? []) {
        const ok = await sendFcm(device.token, item.title, item.body ?? "");
        if (ok) {
          sent = true;
          results.pushSent++;
        } else {
          results.pushFailed++;
        }
      }

      await supabase
        .from("push_queue")
        .update({ processed: true })
        .eq("id", item.id);

      if (!sent && (devices?.length ?? 0) === 0) {
        results.pushFailed++;
      }
    }

    const { data: reminderCount } = await supabase.rpc("send_subscription_renewal_reminders");
    results.renewalReminders = typeof reminderCount === "number" ? reminderCount : 0;

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("platform-cron error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
