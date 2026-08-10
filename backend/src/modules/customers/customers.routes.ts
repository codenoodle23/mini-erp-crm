import { Router } from "express";
import { ROLES } from "../../db/schema";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getPagination } from "../../utils/pagination";
import {
  addFollowUpSchema,
  createCustomerSchema,
  idParamSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from "./customers.schema";
import * as customersService from "./customers.service";

const router = Router();

router.use(requireAuth);

// GET /customers?search=&status=&customerType=&page=&pageSize=
router.get(
  "/",
  validate({ query: listCustomersQuerySchema }),
  asyncHandler(async (req, res) => {
    const pagination = getPagination(req);
    const { search, status, customerType } = req.query as Record<string, string | undefined>;
    const result = await customersService.listCustomers(pagination, {
      search,
      status: status as never,
      customerType: customerType as never,
    });
    res.status(200).json(result);
  })
);

// GET /customers/:id
router.get(
  "/:id",
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const customer = await customersService.getCustomerById((req.params.id as string));
    res.status(200).json({ data: customer });
  })
);

// POST /customers — Sales & Admin create leads/customers
router.post(
  "/",
  requireRole(ROLES.SALES),
  validate({ body: createCustomerSchema }),
  asyncHandler(async (req, res) => {
    const customer = await customersService.createCustomer(req.body, req.user!.userId);
    res.status(201).json({ data: customer });
  })
);

// PUT /customers/:id
router.put(
  "/:id",
  requireRole(ROLES.SALES),
  validate({ params: idParamSchema, body: updateCustomerSchema }),
  asyncHandler(async (req, res) => {
    const customer = await customersService.updateCustomer((req.params.id as string), req.body);
    res.status(200).json({ data: customer });
  })
);

// POST /customers/:id/follow-ups
router.post(
  "/:id/follow-ups",
  requireRole(ROLES.SALES),
  validate({ params: idParamSchema, body: addFollowUpSchema }),
  asyncHandler(async (req, res) => {
    const followUp = await customersService.addFollowUp((req.params.id as string), req.body, req.user!.userId);
    res.status(201).json({ data: followUp });
  })
);

export default router;
