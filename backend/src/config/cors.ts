import { env } from "./env.js";

const configuredOrigins = [env.FRONTEND_URL].filter(Boolean) as string[];

export const allowedOrigins = [
  ...configuredOrigins,
  "http://localhost:3000",
  "http://localhost:3001",
].filter((origin, index, list) => list.indexOf(origin) === index);

export function isAllowedOrigin(origin: string | undefined): boolean {
  return !origin || allowedOrigins.includes(origin);
}
