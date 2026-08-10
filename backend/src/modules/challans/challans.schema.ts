import { z } from "zod";
import { CHALLAN_STATUS_VALUES } from "../../db/schema";

const challanLineSchema = z.object({
  productId: z.string().uuid("Invalid product id"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than zero"),
});

export const createChallanSchema = z.object({
  customerId: z.string().uuid("Invalid customer id"),
  items: z.array(challanLineSchema).min(1, "At least one product line is required"),
  status: z.enum(["DRAFT", "CONFIRMED"]).default("DRAFT"),
});

// Draft challans can have their lines replaced wholesale before confirmation.
export const updateChallanSchema = z.object({
  customerId: z.string().uuid().optional(),
  items: z.array(challanLineSchema).min(1).optional(),
});

export const listChallansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(CHALLAN_STATUS_VALUES).optional(),
  customerId: z.string().uuid().optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid id"),
});

export type CreateChallanInput = z.infer<typeof createChallanSchema>;
export type UpdateChallanInput = z.infer<typeof updateChallanSchema>;
