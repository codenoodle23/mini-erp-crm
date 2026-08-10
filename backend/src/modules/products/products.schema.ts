import { z } from "zod";
import { MOVEMENT_TYPE_VALUES } from "../../db/schema";

export const createProductSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().optional(),
  unitPrice: z.coerce.number().nonnegative("Unit price cannot be negative"),
  currentStock: z.coerce.number().int().min(0).default(0),
  minStockAlert: z.coerce.number().int().min(0).default(0),
  location: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial().omit({ currentStock: true });

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  lowStock: z.coerce.boolean().optional(),
});

export const stockMovementSchema = z.object({
  quantity: z.coerce.number().int().positive("Quantity must be greater than zero"),
  movementType: z.enum(MOVEMENT_TYPE_VALUES),
  reason: z.string().min(1, "Reason is required"),
});

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid id"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type StockMovementInput = z.infer<typeof stockMovementSchema>;
