import { supabase } from "@/integrations/supabase/client";

export interface CallSignalRow {
  id: string;
  caller_id: string;
  callee_id: string;
  signal_type: string;
  signal_data: {
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  };
  created_at: string;
}

export function isPeerCallSignal(
  signal: CallSignalRow,
  userId: string,
  remoteUserId: string,
): boolean {
  return (
    (signal.caller_id === remoteUserId && signal.callee_id === userId) ||
    (signal.caller_id === userId && signal.callee_id === remoteUserId)
  );
}

export function isRemoteCallSignal(signal: CallSignalRow, userId: string): boolean {
  return signal.caller_id !== userId;
}

export async function insertCallSignal(params: {
  callerId: string;
  calleeId: string;
  signalType: string;
  signalData: Record<string, unknown>;
}) {
  await supabase.from("call_signals").insert({
    caller_id: params.callerId,
    callee_id: params.calleeId,
    signal_type: params.signalType,
    signal_data: params.signalData,
  });
}

export async function fetchLatestCallSignal(params: {
  userId: string;
  remoteUserId: string;
  signalType: string;
  fromRemote?: boolean;
}) {
  let query = supabase
    .from("call_signals")
    .select("*")
    .eq("signal_type", params.signalType)
    .order("created_at", { ascending: false })
    .limit(1);

  if (params.fromRemote) {
    query = query.eq("caller_id", params.remoteUserId).eq("callee_id", params.userId);
  } else {
    query = query.or(
      `and(caller_id.eq.${params.userId},callee_id.eq.${params.remoteUserId}),and(caller_id.eq.${params.remoteUserId},callee_id.eq.${params.userId})`,
    );
  }

  const { data } = await query.maybeSingle();
  return data as CallSignalRow | null;
}

export type CallSignalContext = {
  iceCandidateQueue: RTCIceCandidateInit[];
};

async function flushIceCandidateQueue(
  peerConnection: RTCPeerConnection,
  queue: RTCIceCandidateInit[],
) {
  while (queue.length > 0) {
    const candidate = queue[0];
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      queue.shift();
    } catch {
      break;
    }
  }
}

export async function applyCallSignal(
  peerConnection: RTCPeerConnection,
  signal: CallSignalRow,
  sendSignal: (type: string, data: Record<string, unknown>) => Promise<void>,
  offerTypes: string[] = ["offer", "audio-offer"],
  ctx?: CallSignalContext,
) {
  const iceQueue = ctx?.iceCandidateQueue;

  if (offerTypes.includes(signal.signal_type) && signal.signal_data.sdp) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.signal_data.sdp));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    await sendSignal("answer", { sdp: answer });
    if (iceQueue) await flushIceCandidateQueue(peerConnection, iceQueue);
    return "answered";
  }

  if (signal.signal_type === "answer" && signal.signal_data.sdp) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.signal_data.sdp));
    if (iceQueue) await flushIceCandidateQueue(peerConnection, iceQueue);
    return "answered";
  }

  if (signal.signal_type === "ice-candidate" && signal.signal_data.candidate) {
    const candidate = signal.signal_data.candidate;
    if (!peerConnection.remoteDescription) {
      iceQueue?.push(candidate);
      return "ice-queued";
    }
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      iceQueue?.push(candidate);
      return "ice-queued";
    }
    return "ice";
  }

  if (signal.signal_type === "hangup") {
    return "hangup";
  }

  return "ignored";
}

export async function fetchPeerCallSignals(params: {
  userId: string;
  remoteUserId: string;
}) {
  const { data } = await supabase
    .from("call_signals")
    .select("*")
    .or(
      `and(caller_id.eq.${params.userId},callee_id.eq.${params.remoteUserId}),and(caller_id.eq.${params.remoteUserId},callee_id.eq.${params.userId})`,
    )
    .order("created_at", { ascending: true });

  return (data ?? []) as CallSignalRow[];
}

export function subscribeToPeerCallSignals(params: {
  userId: string;
  remoteUserId: string;
  channelName: string;
  onSignal: (signal: CallSignalRow) => void;
}) {
  const channel = supabase
    .channel(params.channelName)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "call_signals" },
      (payload) => {
        const signal = payload.new as CallSignalRow;
        if (!isPeerCallSignal(signal, params.userId, params.remoteUserId)) return;
        params.onSignal(signal);
      },
    )
    .subscribe();

  return channel;
}
