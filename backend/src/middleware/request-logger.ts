import type { NextFunction, Request, Response } from "express";

function logLine(level: "info" | "warn" | "error", message: string): void {
  if (level === "error") console.error(message);
  else if (level === "warn") console.warn(message);
  else console.log(message);
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startedAt = Date.now();
  const requestPath = req.originalUrl.split("?")[0] ?? req.originalUrl;
  let logged = false;

  const log = () => {
    if (logged) return;
    logged = true;
    const durationMs = Date.now() - startedAt;
    const status = res.writableEnded ? res.statusCode : 499;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    logLine(
      level,
      `[http] ${req.method} ${requestPath} ${status} ${durationMs}ms`,
    );
  };

  res.on("finish", log);
  res.on("close", log);
  next();
}
