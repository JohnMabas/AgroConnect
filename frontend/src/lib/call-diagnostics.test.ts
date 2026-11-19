import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fallbackIceConfig,
  logSelectedCandidateType,
  logSignalingFailure,
  toCallErrorMessage,
} from "@/lib/call-diagnostics";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("call diagnostics", () => {
  it("falls back to STUN only", () => {
    expect(fallbackIceConfig()).toEqual({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
  });

  it("maps permission, offline, and timeout errors", () => {
    expect(
      toCallErrorMessage(
        Object.assign(new Error("denied"), { name: "NotAllowedError" }),
        "fallback",
      ),
    ).toContain("permission denied");
    expect(
      toCallErrorMessage(
        Object.assign(new Error("missing"), { code: "NOT_FOUND" }),
        "fallback",
      ),
    ).toContain("offline");
    expect(toCallErrorMessage(new Error("timed out"), "fallback")).toContain(
      "30 seconds",
    );
    expect(toCallErrorMessage(undefined, "fallback")).toBe("fallback");
  });

  it("logs signaling errors without extra payload", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    logSignalingFailure("call:offer", {
      code: "FORBIDDEN",
      token: "must-not-appear",
    });

    expect(error).toHaveBeenCalledWith(
      expect.not.stringContaining("must-not-appear"),
    );
    expect(error).toHaveBeenCalledWith(expect.stringContaining("call:offer"));
  });

  it("logs the selected candidate types", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const stats = new Map<string, unknown>([
      [
        "pair",
        {
          type: "candidate-pair",
          state: "succeeded",
          nominated: true,
          localCandidateId: "local",
          remoteCandidateId: "remote",
        },
      ],
      ["local", { type: "local-candidate", candidateType: "relay" }],
      ["remote", { type: "remote-candidate", candidateType: "srflx" }],
    ]) as unknown as RTCStatsReport;
    const pc = {
      getStats: vi.fn().mockResolvedValue(stats),
    } as unknown as RTCPeerConnection;

    await logSelectedCandidateType(pc, "call-1");

    expect(info).toHaveBeenCalledWith(
      "[call] candidate call=call-1 local=relay remote=srflx",
    );
  });
});
