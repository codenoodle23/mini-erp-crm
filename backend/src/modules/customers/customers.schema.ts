import { z } from "zod";
import { CUSTOMER_STATUS_VALUES, CUSTOMER_TYPE_VALUES } from "../../db/schema";

export const createCustomerSchema = z.object({
  name: z.string().min(2, "Customer name is required"),
  mobile: z.string().min(7, "A valid mobile number is required"),
  email: z.string().email().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  customerType: z.enum(CUSTOMER_TYPE_VALUES).default("RETAIL"),
  address: z.string().optional(),
  status: z.enum(CUSTOMER_STATUS_VALUES).default("LEAD"),
  followUpDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: z.enum(CUSTOMER_STATUS_VALUES).optional(),
  customerType: z.enum(CUSTOMER_TYPE_VALUES).optional(),
});

export const addFollowUpSchema = z.object({
  note: z.string().min(1, "Note text is required"),
  followUpDate: z.coerce.date().optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid id"),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type AddFollowUpInput = z.infer<typeof addFollowUpSchema>;
