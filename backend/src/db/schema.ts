import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"]);
export const customerTypeEnum = pgEnum("customer_type", ["RETAIL", "WHOLESALE", "DISTRIBUTOR"]);
export const customerStatusEnum = pgEnum("customer_status", ["LEAD", "ACTIVE", "INACTIVE"]);
export const movementTypeEnum = pgEnum("movement_type", ["IN", "OUT"]);
export const challanStatusEnum = pgEnum("challan_status", ["DRAFT", "CONFIRMED", "CANCELLED"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull(),
  email: text("email"),
  businessName: text("business_name"),
  gstNumber: text("gst_number"),
  customerType: customerTypeEnum("customer_type").notNull().default("RETAIL"),
  address: text("address"),
  status: customerStatusEnum("status").notNull().default("LEAD"),
  followUpDate: timestamp("follow_up_date"),
  notes: text("notes"),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const customerFollowUps = pgTable("customer_follow_ups", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  followUpDate: timestamp("follow_up_date"),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  category: text("category"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  currentStock: integer("current_stock").notNull().default(0),
  minStockAlert: integer("min_stock_alert").notNull().default(0),
  location: text("location"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  movementType: movementTypeEnum("movement_type").notNull(),
  reason: text("reason").notNull(),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const challans = pgTable("challans", {
  id: uuid("id").defaultRandom().primaryKey(),
  challanNumber: text("challan_number").notNull().unique(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  totalQuantity: integer("total_quantity").notNull().default(0),
  status: challanStatusEnum("status").notNull().default("DRAFT"),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Snapshot fields are intentionally denormalized so a challan keeps showing
// the product details exactly as they were at the time of sale, even if the
// underlying product record is edited or repriced later.
export const challanItems = pgTable("challan_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  challanId: uuid("challan_id")
    .notNull()
    .references(() => challans.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  skuSnapshot: text("sku_snapshot").notNull(),
  unitPriceSnapshot: numeric("unit_price_snapshot", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
});

// ---- Relations (used for query-builder `with: {...}` includes) ----

export const usersRelations = relations(users, ({ many }) => ({
  customersCreated: many(customers),
  followUpsCreated: many(customerFollowUps),
  stockMovementsCreated: many(stockMovements),
  challansCreated: many(challans),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  createdBy: one(users, { fields: [customers.createdById], references: [users.id] }),
  followUps: many(customerFollowUps),
  challans: many(challans),
}));

export const customerFollowUpsRelations = relations(customerFollowUps, ({ one }) => ({
  customer: one(customers, { fields: [customerFollowUps.customerId], references: [customers.id] }),
  createdBy: one(users, { fields: [customerFollowUps.createdById], references: [users.id] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  stockMovements: many(stockMovements),
  challanItems: many(challanItems),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, { fields: [stockMovements.productId], references: [products.id] }),
  createdBy: one(users, { fields: [stockMovements.createdById], references: [users.id] }),
}));

export const challansRelations = relations(challans, ({ one, many }) => ({
  customer: one(customers, { fields: [challans.customerId], references: [customers.id] }),
  createdBy: one(users, { fields: [challans.createdById], references: [users.id] }),
  items: many(challanItems),
}));

export const challanItemsRelations = relations(challanItems, ({ one }) => ({
  challan: one(challans, { fields: [challanItems.challanId], references: [challans.id] }),
  product: one(products, { fields: [challanItems.productId], references: [products.id] }),
}));

export type Role = (typeof roleEnum.enumValues)[number];
export type CustomerType = (typeof customerTypeEnum.enumValues)[number];
export type CustomerStatus = (typeof customerStatusEnum.enumValues)[number];
export type MovementType = (typeof movementTypeEnum.enumValues)[number];
export type ChallanStatus = (typeof challanStatusEnum.enumValues)[number];

// Convenience constant objects mirroring the enum values, so call sites can
// write `ROLES.ADMIN` etc. instead of raw string literals.
export const ROLES = { ADMIN: "ADMIN", SALES: "SALES", WAREHOUSE: "WAREHOUSE", ACCOUNTS: "ACCOUNTS" } as const;
export const CUSTOMER_TYPES = { RETAIL: "RETAIL", WHOLESALE: "WHOLESALE", DISTRIBUTOR: "DISTRIBUTOR" } as const;
export const CUSTOMER_STATUSES = { LEAD: "LEAD", ACTIVE: "ACTIVE", INACTIVE: "INACTIVE" } as const;
export const MOVEMENT_TYPES = { IN: "IN", OUT: "OUT" } as const;
export const CHALLAN_STATUSES = { DRAFT: "DRAFT", CONFIRMED: "CONFIRMED", CANCELLED: "CANCELLED" } as const;

// Plain `as const` tuples for Zod schemas — kept in sync with the pgEnum
// definitions above. (Zod v4's `z.enum` uses a `const` type parameter that
// needs a literal tuple; Drizzle's `PgEnum.enumValues` type doesn't satisfy
// that inference, so schemas import these instead of `.enumValues`.)
export const ROLE_VALUES = ["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"] as const;
export const CUSTOMER_TYPE_VALUES = ["RETAIL", "WHOLESALE", "DISTRIBUTOR"] as const;
export const CUSTOMER_STATUS_VALUES = ["LEAD", "ACTIVE", "INACTIVE"] as const;
export const MOVEMENT_TYPE_VALUES = ["IN", "OUT"] as const;
export const CHALLAN_STATUS_VALUES = ["DRAFT", "CONFIRMED", "CANCELLED"] as const;
