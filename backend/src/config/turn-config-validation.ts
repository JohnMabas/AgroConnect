const TURN_CONFIG_KEYS = ["TURN_URLS", "TURN_USERNAME", "TURN_CREDENTIAL"] as const;

type TurnConfig = Record<(typeof TURN_CONFIG_KEYS)[number], string | undefined>;

export function warnOnMissingTurnConfig(
  nodeEnv: string,
  config: TurnConfig,
): void {
  if (nodeEnv !== "production") return;

  const missing = TURN_CONFIG_KEYS.filter((key) => !config[key]);
  if (missing.length === 0) return;

  console.warn(
    `[webrtc] Missing production TURN configuration: ${missing.join(", ")}. Calls may fail across restrictive networks.`,
  );
}
