import type { NextFunction, Response } from "express";

export function handleImageServiceError(
  err: unknown,
  res: Response,
  next: NextFunction,
): void {
  const e = err as Error & { code?: string };
  switch (e.code) {
    case "INVALID_IMAGE":
    case "INVALID_OPERATION":
      res.status(400).json({ success: false, error: { message: e.message } });
      return;
    case "NOT_FOUND":
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    case "FORBIDDEN":
      res.status(403).json({ success: false, error: { message: e.message } });
      return;
    case "DUPLICATE_PROFILE":
      res.status(409).json({ success: false, error: { message: e.message } });
      return;
    default:
      next(err);
  }
}
