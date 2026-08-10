import { Router } from "express";
import { ROLES } from "../../db/schema";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createUserSchema, loginSchema } from "./auth.schema";
import * as authService from "./auth.service";

const router = Router();

// POST /auth/login — public
router.post(
  "/login",
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  })
);

// GET /auth/me — whoever is logged in
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user!.userId);
    res.status(200).json({ data: user });
  })
);

// POST /auth/users — admin-only, creates a login for an employee
router.post(
  "/users",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate({ body: createUserSchema }),
  asyncHandler(async (req, res) => {
    const user = await authService.createUser(req.body);
    res.status(201).json({ data: user });
  })
);

export default router;
