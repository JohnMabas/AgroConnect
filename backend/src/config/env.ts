import dotenv from "dotenv";

dotenv.config({ quiet: true });

function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return 5000;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT environment variable: "${value}"`);
  }

  return port;
}

export const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parsePort(process.env.PORT),
});
