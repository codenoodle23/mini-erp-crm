import { Router } from "express";
import { ROLES } from "../../db/schema";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getPagination } from "../../utils/pagination";
import {
  createProductSchema,
  idParamSchema,
  listProductsQuerySchema,
  stockMovementSchema,
  updateProductSchema,
} from "./products.schema";
import * as productsService from "./products.service";

const router = Router();

router.use(requireAuth);

// GET /products?search=&category=&lowStock=&page=&pageSize=
router.get(
  "/",
  validate({ query: listProductsQuerySchema }),
  asyncHandler(async (req, res) => {
    const pagination = getPagination(req);
    const { search, category, lowStock } = req.query as Record<string, string | undefined>;
    const result = await productsService.listProducts(pagination, {
      search,
      category,
      lowStock: lowStock === "true",
    });
    res.status(200).json(result);
  })
);

// GET /products/:id
router.get(
  "/:id",
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const product = await productsService.getProductById((req.params.id as string));
    res.status(200).json({ data: product });
  })
);

// POST /products — Warehouse & Admin
router.post(
  "/",
  requireRole(ROLES.WAREHOUSE),
  validate({ body: createProductSchema }),
  asyncHandler(async (req, res) => {
    const product = await productsService.createProduct(req.body);
    res.status(201).json({ data: product });
  })
);

// PUT /products/:id
router.put(
  "/:id",
  requireRole(ROLES.WAREHOUSE),
  validate({ params: idParamSchema, body: updateProductSchema }),
  asyncHandler(async (req, res) => {
    const product = await productsService.updateProduct((req.params.id as string), req.body);
    res.status(200).json({ data: product });
  })
);

// POST /products/:id/stock-movements — record IN/OUT stock movement
router.post(
  "/:id/stock-movements",
  requireRole(ROLES.WAREHOUSE),
  validate({ params: idParamSchema, body: stockMovementSchema }),
  asyncHandler(async (req, res) => {
    const movement = await productsService.recordStockMovement((req.params.id as string), req.body, req.user!.userId);
    res.status(201).json({ data: movement });
  })
);

export default router;
