import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  verifyAccessToken,
  type AccessTokenPayload,
} from "../services/token.service.js";
import { fetchUserRoles } from "../services/user-roles.service.js";

// Augment the Express Request type to carry the authenticated user payload.
declare module "express-serve-static-core" {
  interface Request {
    user?: AccessTokenPayload;
  }
}

/**
 * authenticate — verifies the JWT access token in the Authorization header,
 * then refreshes the user's roles from the database so role changes made
 * after token issuance are always reflected immediately.
 *
 * Expects: `Authorization: Bearer <token>`
 *
 * On success: attaches `req.user` (with live roles) and calls next().
 * On failure: responds with 401 and does not call next().
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: { message: "Authentication required. Provide a Bearer token." },
    });
    return;
  }

  const token = authHeader.slice(7).trim();

  let payload: AccessTokenPayload;
  try {
    payload = verifyAccessToken(token);
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
    return;
  }

  // Refresh roles from the database so that role assignments made after
  // token issuance are reflected without requiring a new login.
  const liveRoles = await fetchUserRoles(payload.sub);

  req.user = { ...payload, roles: liveRoles };
  next();
}

/**
 * optionalAuthenticate — attaches `req.user` when a valid Bearer token is
 * supplied, but allows anonymous requests to continue. Invalid or expired
 * tokens are treated as anonymous rather than failing the request.
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7).trim();

  try {
    const payload = verifyAccessToken(token);
    const liveRoles = await fetchUserRoles(payload.sub);
    req.user = { ...payload, roles: liveRoles };
  } catch {
    // Anonymous access for public endpoints.
  }

  next();
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
