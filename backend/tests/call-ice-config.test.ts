import { describe, expect, it } from "vitest";
import { buildCallIceConfig } from "../src/modules/calls/calls.ice-config.js";

describe("buildCallIceConfig", () => {
  it("splits URLs, trims spaces, and attaches credentials to TURN only", () => {
    const config = buildCallIceConfig({
      stunUrls: " stun:one.example , stun:two.example ",
      turnUrls:
        " turn:turn.example?transport=udp , turns:turn.example?transport=tcp , https://ignored.example ",
      turnUsername: " metered-user ",
      turnCredential: " metered-pass ",
    });

    expect(config).toEqual({
      iceServers: [
        { urls: ["stun:one.example", "stun:two.example"] },
        {
          urls: [
            "turn:turn.example?transport=udp",
            "turns:turn.example?transport=tcp",
          ],
          username: "metered-user",
          credential: "metered-pass",
        },
      ],
      turnConfigured: true,
    });
  });

  it("reports TURN as unconfigured when credentials are missing", () => {
    const config = buildCallIceConfig({
      stunUrls: "stun:one.example",
      turnUrls: "turn:turn.example",
      turnUsername: undefined,
      turnCredential: undefined,
    });

    expect(config.iceServers[1]).toEqual({ urls: "turn:turn.example" });
    expect(config.turnConfigured).toBe(false);
  });

  it("returns an empty array when no URLs are configured", () => {
    const config = buildCallIceConfig({
      stunUrls: undefined,
      turnUrls: " , ",
      turnUsername: "user",
      turnCredential: "pass",
    });

    expect(config).toEqual({ iceServers: [], turnConfigured: false });
  });
});
