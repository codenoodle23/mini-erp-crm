import { Router } from "express";
import { ROLES } from "../../db/schema";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getPagination } from "../../utils/pagination";
import { createChallanSchema, idParamSchema, listChallansQuerySchema, updateChallanSchema } from "./challans.schema";
import * as challansService from "./challans.service";

const router = Router();

router.use(requireAuth);

// GET /challans?status=&customerId=&page=&pageSize=
router.get(
  "/",
  validate({ query: listChallansQuerySchema }),
  asyncHandler(async (req, res) => {
    const pagination = getPagination(req);
    const { status, customerId } = req.query as Record<string, string | undefined>;
    const result = await challansService.listChallans(pagination, { status: status as never, customerId });
    res.status(200).json(result);
  })
);

// GET /challans/:id
router.get(
  "/:id",
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const challan = await challansService.getChallanById((req.params.id as string));
    res.status(200).json({ data: challan });
  })
);

// POST /challans — Sales creates a Draft or directly Confirmed challan
router.post(
  "/",
  requireRole(ROLES.SALES),
  validate({ body: createChallanSchema }),
  asyncHandler(async (req, res) => {
    const challan = await challansService.createChallan(req.body, req.user!.userId);
    res.status(201).json({ data: challan });
  })
);

// PUT /challans/:id — edit line items while still DRAFT
router.put(
  "/:id",
  requireRole(ROLES.SALES),
  validate({ params: idParamSchema, body: updateChallanSchema }),
  asyncHandler(async (req, res) => {
    const challan = await challansService.updateChallan((req.params.id as string), req.body);
    res.status(200).json({ data: challan });
  })
);

// POST /challans/:id/confirm — deducts stock, DRAFT -> CONFIRMED
router.post(
  "/:id/confirm",
  requireRole(ROLES.SALES, ROLES.WAREHOUSE),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const challan = await challansService.confirmChallan((req.params.id as string), req.user!.userId);
    res.status(200).json({ data: challan });
  })
);

// POST /challans/:id/cancel — restores stock if it had been confirmed
router.post(
  "/:id/cancel",
  requireRole(ROLES.SALES, ROLES.WAREHOUSE),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const challan = await challansService.cancelChallan((req.params.id as string), req.user!.userId);
    res.status(200).json({ data: challan });
  })
);

export default router;
