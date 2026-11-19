import type { CallConfigData, IceServerConfig } from "./calls.types.js";

export interface CallIceConfigInput {
  stunUrls: string | undefined;
  turnUrls: string | undefined;
  turnUsername: string | undefined;
  turnCredential: string | undefined;
}

function parseUrls(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isTurnUrl(url: string): boolean {
  return url.startsWith("turn:") || url.startsWith("turns:");
}

export function buildCallIceConfig(input: CallIceConfigInput): CallConfigData {
  const stunUrls = parseUrls(input.stunUrls);
  const turnUrls = parseUrls(input.turnUrls).filter(isTurnUrl);
  const turnUsername = input.turnUsername?.trim();
  const turnCredential = input.turnCredential?.trim();
  const iceServers: IceServerConfig[] = [];

  if (stunUrls.length > 0) {
    iceServers.push({
      urls: stunUrls.length === 1 ? stunUrls[0]! : stunUrls,
    });
  }

  if (turnUrls.length > 0) {
    iceServers.push({
      urls: turnUrls.length === 1 ? turnUrls[0]! : turnUrls,
      ...(turnUsername ? { username: turnUsername } : {}),
      ...(turnCredential ? { credential: turnCredential } : {}),
    });
  }

  return {
    iceServers,
    turnConfigured:
      turnUrls.length > 0 && Boolean(turnUsername && turnCredential),
  };
}
