import { resolve4 } from "node:dns/promises";
import dotenv from "dotenv";

let resolution: Promise<void> | undefined;

function databaseHostname(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (rawUrl !== undefined) {
    try {
      return new URL(rawUrl).hostname;
    } catch {
      return undefined;
    }
  }

  return process.env.DB_HOST;
}

async function resolveDatabaseHost(): Promise<void> {
  dotenv.config({ quiet: true });

  const hostname = databaseHostname();
  if (hostname === undefined || hostname === "" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return;
  }

  let ipv4: string | undefined;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      ipv4 = (await resolve4(hostname))[0];
      if (ipv4 !== undefined) break;
    } catch {
      if (attempt === 3) return;
      await new Promise<void>((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }

  if (ipv4 === undefined) return;

  const rawUrl = process.env.DATABASE_URL;
  const rawHost = process.env.DB_HOST;

  if (rawUrl !== undefined) {
    const parsed = new URL(rawUrl);
    process.env.DB_SSL_SERVERNAME ??= parsed.hostname;
    parsed.hostname = ipv4;
    process.env.DATABASE_URL = parsed.toString();
  } else if (rawHost !== undefined) {
    process.env.DB_SSL_SERVERNAME ??= rawHost;
    process.env.DB_HOST = ipv4;
  }
}

export function ensureDatabaseHostResolved(): Promise<void> {
  resolution ??= resolveDatabaseHost();
  return resolution;
}

await ensureDatabaseHostResolved();
