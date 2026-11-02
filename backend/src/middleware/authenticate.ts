import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  verifyAccessToken,
  type AccessTokenPayload,
} from "../services/token.service.js";

// Augment the Express Request type to carry the authenticated user payload.
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/**
 * authenticate — verifies the JWT access token in the Authorization header.
 *
 * Expects: `Authorization: Bearer <token>`
 *
 * On success: attaches `req.user` and calls next().
 * On failure: responds with 401 and does not call next().
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: { message: "Authentication required. Provide a Bearer token." },
    });
    return;
  }

  const token = authHeader.slice(7).trim();

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: { message: "Access token has expired. Please refresh your session." },
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: { message: "Invalid access token." },
    });
  }
}

/**
 * requireRoles — authorization middleware.
 *
 * Must be used after `authenticate`. Returns 403 if the authenticated user
 * does not have at least one of the required roles.
 */
export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: "Authentication required." },
      });
      return;
    }

    const userRoles = req.user.roles ?? [];
    const hasRole = roles.some((r) => userRoles.includes(r));

    if (!hasRole) {
      res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Required role(s): ${roles.join(", ")}.`,
        },
      });
      return;
    }

    next();
  };
}
