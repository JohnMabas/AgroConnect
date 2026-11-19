import { afterEach, describe, expect, it, vi } from "vitest";
import { warnOnMissingTurnConfig } from "../src/config/turn-config-validation.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("warnOnMissingTurnConfig", () => {
  it("names missing TURN variables in production", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnOnMissingTurnConfig("production", {
      TURN_URLS: undefined,
      TURN_USERNAME: "set",
      TURN_CREDENTIAL: undefined,
    });

    expect(warn).toHaveBeenCalledWith(
      "[webrtc] Missing production TURN configuration: TURN_URLS, TURN_CREDENTIAL. Calls may fail across restrictive networks.",
    );
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("set"));
  });

  it("stays silent when all TURN variables are present", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnOnMissingTurnConfig("production", {
      TURN_URLS: "turn:example",
      TURN_USERNAME: "user",
      TURN_CREDENTIAL: "pass",
    });

    expect(warn).not.toHaveBeenCalled();
  });

  it("stays silent outside production", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnOnMissingTurnConfig("development", {
      TURN_URLS: undefined,
      TURN_USERNAME: undefined,
      TURN_CREDENTIAL: undefined,
    });

    expect(warn).not.toHaveBeenCalled();
  });
});
