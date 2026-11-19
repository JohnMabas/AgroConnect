type CandidateStats = RTCStats & { candidateType?: string };

export const FALLBACK_STUN_URL = "stun:stun.l.google.com:19302";

export function fallbackIceConfig(): RTCConfiguration {
  return { iceServers: [{ urls: FALLBACK_STUN_URL }] };
}

export function toCallErrorMessage(error: unknown, fallback: string): string {
  const record = error as
    | { name?: string; message?: string; code?: string | number }
    | null;
  const name = error instanceof Error ? error.name : (record?.name ?? "");
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : (record?.message ?? "");
  const code = record?.code;

  if (
    name === "NotAllowedError" ||
    name === "PermissionDeniedError" ||
    code === 403
  ) {
    return "Microphone/camera permission denied. Allow access in your browser settings and try again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No microphone or camera was found on this device.";
  }

  const text = message.toLowerCase();
  if (
    text.includes("offline") ||
    text.includes("not connected") ||
    code === "NOT_FOUND"
  ) {
    return "The other user is offline or unavailable. Try again later.";
  }
  if (text.includes("no answer") || text.includes("timed out")) {
    return "No answer after 30 seconds. Try the call again.";
  }

  return message || fallback;
}

export function logSignalingFailure(event: string, error: unknown): void {
  const code = (error as { code?: string | number } | null)?.code ?? "UNKNOWN";
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "signaling error";
  console.error(`[signaling] ${event} failed code=${code} message=${message}`);
}

export async function logSelectedCandidateType(
  pc: RTCPeerConnection,
  callId: string,
): Promise<void> {
  try {
    const stats = await pc.getStats();
    let selectedPair: RTCIceCandidatePairStats | undefined;

    stats.forEach((report) => {
      if (report.type !== "candidate-pair") return;
      const pair = report as RTCIceCandidatePairStats;
      if (pair.state === "succeeded" && (pair.nominated || !selectedPair)) {
        selectedPair = pair;
      }
    });

    if (!selectedPair) return;

    const local = stats.get(selectedPair.localCandidateId) as
      | CandidateStats
      | undefined;
    const remote = stats.get(selectedPair.remoteCandidateId) as
      | CandidateStats
      | undefined;

    console.info(
      `[call] candidate call=${callId} local=${local?.candidateType ?? "unknown"} remote=${remote?.candidateType ?? "unknown"}`,
    );
  } catch {
    console.warn(`[call] candidate stats unavailable call=${callId}`);
  }
}
