import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client";
import {
  challanItems,
  challans,
  ChallanStatus,
  CHALLAN_STATUSES,
  customers,
  MOVEMENT_TYPES,
  products,
  stockMovements,
} from "../../db/schema";
import { ApiError } from "../../utils/ApiError";
import { buildPaginatedResponse, PaginationParams } from "../../utils/pagination";
import { generateChallanNumber } from "../../utils/challanNumber";
import { CreateChallanInput, UpdateChallanInput } from "./challans.schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface ListFilters {
  status?: ChallanStatus;
  customerId?: string;
}

async function getFullChallan(executor: Tx | typeof db, id: string) {
  return executor.query.challans.findFirst({
    where: eq(challans.id, id),
    with: {
      customer: { columns: { id: true, name: true, mobile: true, email: true, businessName: true, gstNumber: true, address: true } },
      createdBy: { columns: { id: true, name: true } },
      items: true,
    },
  });
}

export async function listChallans(pagination: PaginationParams, filters: ListFilters) {
  const clauses = [];
  if (filters.status) clauses.push(eq(challans.status, filters.status));
  if (filters.customerId) clauses.push(eq(challans.customerId, filters.customerId));
  const where = clauses.length > 0 ? and(...clauses) : undefined;

  const [data, countResult] = await Promise.all([
    db.query.challans.findMany({
      where,
      limit: pagination.take,
      offset: pagination.skip,
      orderBy: desc(challans.createdAt),
      with: {
        customer: { columns: { id: true, name: true, mobile: true, email: true, businessName: true, gstNumber: true, address: true } },
        createdBy: { columns: { id: true, name: true } },
        items: true,
      },
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(challans).where(where),
  ]);

  return buildPaginatedResponse(data, countResult[0]?.count ?? 0, pagination);
}

export async function getChallanById(id: string) {
  const challan = await getFullChallan(db, id);
  if (!challan) throw ApiError.notFound("Challan not found");
  return challan;
}

/**
 * Loads the products for the requested lines and builds snapshot line
 * items. Does NOT touch stock — that only happens at confirmation time
 * (see deductStockForItems).
 */
async function buildLineItems(tx: Tx, items: { productId: string; quantity: number }[]) {
  const productIds = items.map((i) => i.productId);
  const rows = await tx.select().from(products).where(inArray(products.id, productIds));
  const productMap = new Map(rows.map((p) => [p.id, p]));

  const missing = productIds.filter((id) => !productMap.has(id));
  if (missing.length > 0) {
    throw ApiError.badRequest(`Unknown product id(s): ${missing.join(", ")}`);
  }

  return items.map((item) => {
    const product = productMap.get(item.productId)!;
    const lineTotal = Number(product.unitPrice) * item.quantity;
    return {
      productId: product.id,
      productNameSnapshot: product.name,
      skuSnapshot: product.sku,
      unitPriceSnapshot: product.unitPrice,
      quantity: item.quantity,
      lineTotal: String(lineTotal),
    };
  });
}

/**
 * Validates sufficient stock for every line and decrements it, writing a
 * matching StockMovement (OUT) per line for audit trail. Throws 400 with a
 * clear message on the first line that doesn't have enough stock — nothing
 * is partially applied because this runs inside the caller's transaction.
 */
async function deductStockForItems(
  tx: Tx,
  items: { productId: string; quantity: number; productNameSnapshot: string }[],
  challanNumber: string,
  createdById: string
) {
  for (const item of items) {
    const [product] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!product) throw ApiError.badRequest(`Unknown product id: ${item.productId}`);

    if (product.currentStock < item.quantity) {
      throw ApiError.badRequest(
        `Insufficient stock for "${item.productNameSnapshot}": available ${product.currentStock}, requested ${item.quantity}`
      );
    }

    await tx
      .update(products)
      .set({ currentStock: product.currentStock - item.quantity, updatedAt: new Date() })
      .where(eq(products.id, item.productId));

    await tx.insert(stockMovements).values({
      productId: item.productId,
      quantity: item.quantity,
      movementType: MOVEMENT_TYPES.OUT,
      reason: `Sales challan ${challanNumber}`,
      createdById,
    });
  }
}

/** Reverses deductStockForItems — used when cancelling a confirmed challan. */
async function restoreStockForItems(
  tx: Tx,
  items: { productId: string; quantity: number }[],
  challanNumber: string,
  createdById: string
) {
  for (const item of items) {
    const [product] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!product) continue;

    await tx
      .update(products)
      .set({ currentStock: product.currentStock + item.quantity, updatedAt: new Date() })
      .where(eq(products.id, item.productId));

    await tx.insert(stockMovements).values({
      productId: item.productId,
      quantity: item.quantity,
      movementType: MOVEMENT_TYPES.IN,
      reason: `Cancelled sales challan ${challanNumber}`,
      createdById,
    });
  }
}

export async function createChallan(input: CreateChallanInput, createdById: string) {
  return db.transaction(async (tx) => {
    const [customer] = await tx.select().from(customers).where(eq(customers.id, input.customerId)).limit(1);
    if (!customer) throw ApiError.badRequest("Unknown customer id");

    const lineItems = await buildLineItems(tx, input.items);
    const totalQuantity = lineItems.reduce((sum, i) => sum + i.quantity, 0);
    const challanNumber = await generateChallanNumber(tx);

    // Stock is only ever touched when a challan is (or becomes) CONFIRMED.
    if (input.status === CHALLAN_STATUSES.CONFIRMED) {
      await deductStockForItems(tx, lineItems, challanNumber, createdById);
    }

    const [challan] = await tx
      .insert(challans)
      .values({
        challanNumber,
        customerId: input.customerId,
        totalQuantity,
        status: input.status,
        createdById,
      })
      .returning();

    await tx.insert(challanItems).values(lineItems.map((item) => ({ ...item, challanId: challan.id })));

    return getFullChallan(tx, challan.id);
  });
}

/** Replaces the line items of a DRAFT challan. Confirmed/cancelled challans are immutable. */
export async function updateChallan(id: string, input: UpdateChallanInput) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(challans).where(eq(challans.id, id)).limit(1);
    if (!existing) throw ApiError.notFound("Challan not found");
    if (existing.status !== CHALLAN_STATUSES.DRAFT) {
      throw ApiError.badRequest(`Cannot edit a challan with status ${existing.status}`);
    }

    if (input.customerId) {
      const [customer] = await tx.select().from(customers).where(eq(customers.id, input.customerId)).limit(1);
      if (!customer) throw ApiError.badRequest("Unknown customer id");
    }

    if (input.items) {
      const lineItems = await buildLineItems(tx, input.items);
      const totalQuantity = lineItems.reduce((sum, i) => sum + i.quantity, 0);

      await tx.delete(challanItems).where(eq(challanItems.challanId, id));
      await tx.insert(challanItems).values(lineItems.map((item) => ({ ...item, challanId: id })));
      await tx
        .update(challans)
        .set({
          ...(input.customerId ? { customerId: input.customerId } : {}),
          totalQuantity,
          updatedAt: new Date(),
        })
        .where(eq(challans.id, id));
    } else if (input.customerId) {
      await tx.update(challans).set({ customerId: input.customerId, updatedAt: new Date() }).where(eq(challans.id, id));
    }

    return getFullChallan(tx, id);
  });
}

/** Confirms a DRAFT challan: validates & deducts stock, flips status to CONFIRMED. */
export async function confirmChallan(id: string, confirmedById: string) {
  return db.transaction(async (tx) => {
    const challan = await getFullChallan(tx, id);
    if (!challan) throw ApiError.notFound("Challan not found");
    if (challan.status !== CHALLAN_STATUSES.DRAFT) {
      throw ApiError.badRequest(`Only DRAFT challans can be confirmed (current status: ${challan.status})`);
    }

    await deductStockForItems(
      tx,
      challan.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        productNameSnapshot: i.productNameSnapshot,
      })),
      challan.challanNumber,
      confirmedById
    );

    await tx.update(challans).set({ status: CHALLAN_STATUSES.CONFIRMED, updatedAt: new Date() }).where(eq(challans.id, id));

    return getFullChallan(tx, id);
  });
}

/** Cancels a challan. If it was CONFIRMED, restores the stock that was deducted. */
export async function cancelChallan(id: string, cancelledById: string) {
  return db.transaction(async (tx) => {
    const challan = await getFullChallan(tx, id);
    if (!challan) throw ApiError.notFound("Challan not found");
    if (challan.status === CHALLAN_STATUSES.CANCELLED) {
      throw ApiError.badRequest("Challan is already cancelled");
    }

    if (challan.status === CHALLAN_STATUSES.CONFIRMED) {
      await restoreStockForItems(
        tx,
        challan.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        challan.challanNumber,
        cancelledById
      );
    }

    await tx.update(challans).set({ status: CHALLAN_STATUSES.CANCELLED, updatedAt: new Date() }).where(eq(challans.id, id));

    return getFullChallan(tx, id);
  });
}
