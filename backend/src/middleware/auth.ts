import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role, ROLES } from "../db/schema";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

export interface AuthPayload {
  userId: string;
  email: string;
  role: Role;
}

// Augment Express's Request type so `req.user` is typed everywhere.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Verifies the Bearer token on the Authorization header and attaches the
 * decoded payload to req.user. Every route below /api except /auth/login
 * requires this.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing or malformed Authorization header");
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    throw ApiError.unauthorized("Invalid or expired token");
  }
}

/**
 * Restricts a route to a set of roles. Must be used after requireAuth.
 * ADMIN is always allowed through in addition to the listed roles, since
 * in this system admins can perform every operational action — pass the
 * operational roles that should ALSO be allowed (e.g. requireRole("SALES")).
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }
    if (req.user.role !== ROLES.ADMIN && !roles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `This action requires one of the following roles: ADMIN, ${roles.join(", ")}`
      );
    }
    next();
  };
}
