import type { NextFunction, Request, Response } from "express";

export function requestTimeout(timeoutMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestPath = req.originalUrl.split("?")[0] ?? req.originalUrl;
    let settled = false;
    const state: { timer?: ReturnType<typeof setTimeout> } = {};

    const clear = () => {
      settled = true;
      if (state.timer) clearTimeout(state.timer);
    };

    state.timer = setTimeout(() => {
      if (res.headersSent || settled) return;
      settled = true;
      res.locals.timedOut = true;
      console.error(
        `[http-timeout] ${req.method} ${requestPath} ${timeoutMs}ms`,
      );
      res.status(504).json({
        success: false,
        error: { message: "Request timed out. Please retry." },
      });
    }, timeoutMs);

    res.on("finish", clear);
    res.on("close", clear);
    next();
  };
}
