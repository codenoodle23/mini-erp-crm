import { NextFunction, Request, Response } from "express";
import { ZodError, ZodType } from "zod";
import { ApiError } from "../utils/ApiError";

interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validates req.body / req.query / req.params against the given Zod
 * schemas, replacing them with the parsed (and coerced/defaulted) values.
 * On failure, throws a 400 ApiError with field-level details.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query) as Record<string, unknown>;
        // Express 5's req.query is a getter with no setter, so we mutate the
        // existing object in place instead of reassigning req.query itself.
        Object.assign(req.query as Record<string, unknown>, parsed);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as unknown as typeof req.params;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw ApiError.badRequest(
          "Validation failed",
          err.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
        );
      }
      throw err;
    }
  };
}
