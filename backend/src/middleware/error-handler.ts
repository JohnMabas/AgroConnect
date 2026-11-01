import type { ErrorRequestHandler } from "express";
import { env } from "../config/env.js";

type HttpError = Error & {
  status?: number;
  statusCode?: number;
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const error = err as HttpError;
  const status = error.status ?? error.statusCode ?? 500;
  const isServerError = status >= 500;

  if (isServerError) {
    console.error(error);
  }

  res.status(status).json({
    success: false,
    error: {
      message: isServerError ? "Internal server error" : error.message,
      ...(isServerError && env.NODE_ENV === "development"
        ? { details: error.message }
        : {}),
    },
  });
};
