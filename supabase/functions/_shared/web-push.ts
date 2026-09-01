/** Web Push (VAPID) helpers for Deno edge functions */

export interface WebPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function parseWebPushToken(token: string): WebPushSubscription | null {
  try {
    const parsed = JSON.parse(token) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (parsed.endpoint && parsed.keys?.p256dh && parsed.keys?.auth) {
      return {
        endpoint: parsed.endpoint,
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
      };
    }
  } catch {
    // legacy plain token
  }
  return null;
}

export function buildSubscription(device: {
  endpoint?: string | null;
  p256dh?: string | null;
  auth_key?: string | null;
  token: string;
}): WebPushSubscription | null {
  if (device.endpoint && device.p256dh && device.auth_key) {
    return {
      endpoint: device.endpoint,
      p256dh: device.p256dh,
      auth: device.auth_key,
    };
  }
  return parseWebPushToken(device.token);
}

export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: { title: string; body: string; url?: string },
): Promise<boolean> {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@amova.space";

  if (!publicKey || !privateKey) {
    console.warn("VAPID keys not configured — skipping web push");
    return false;
  }

  try {
    const webpush = await import("npm:web-push@3");
    webpush.setVapidDetails(subject, publicKey, privateKey);

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || "/notifications",
      }),
    );
    return true;
  } catch (error) {
    console.error("Web push send error:", error);
    return false;
  }
}
