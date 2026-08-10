import { NextFunction, Request, Response } from "express";
import { DatabaseError } from "pg";
import { ApiError } from "../utils/ApiError";

/**
 * Central error handler. Every route uses asyncHandler so thrown/rejected
 * errors always land here — this is the single place that decides the
 * HTTP status code and JSON error shape returned to clients.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, details: err.details ?? undefined },
    });
  }

  // node-postgres surfaces DB errors with the raw Postgres error code.
  if (err instanceof DatabaseError) {
    if (err.code === "23505") {
      // unique_violation
      return res.status(409).json({
        error: { message: `A record with this ${err.detail ?? "value"} already exists` },
      });
    }
    if (err.code === "23503") {
      // foreign_key_violation
      return res.status(400).json({
        error: { message: "This action references a record that does not exist" },
      });
    }
    if (err.code === "23502") {
      // not_null_violation
      return res.status(400).json({ error: { message: `Missing required field: ${err.column ?? "unknown"}` } });
    }
    console.error("Database error:", err);
    return res.status(400).json({ error: { message: "Database request error" } });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({ error: { message: "Internal server error" } });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
}
