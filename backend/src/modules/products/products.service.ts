import { and, desc, eq, ilike, or, sql, SQL } from "drizzle-orm";
import { db } from "../../db/client";
import { MOVEMENT_TYPES, products, stockMovements } from "../../db/schema";
import { ApiError } from "../../utils/ApiError";
import { buildPaginatedResponse, PaginationParams } from "../../utils/pagination";
import { CreateProductInput, StockMovementInput, UpdateProductInput } from "./products.schema";

interface ListFilters {
  search?: string;
  category?: string;
  lowStock?: boolean;
}

function buildWhere(filters: ListFilters): SQL | undefined {
  const clauses: SQL[] = [];
  if (filters.category) clauses.push(eq(products.category, filters.category));
  if (filters.search) {
    const term = `%${filters.search}%`;
    const searchClause = or(ilike(products.name, term), ilike(products.sku, term));
    if (searchClause) clauses.push(searchClause);
  }
  // currentStock <= minStockAlert, expressed as a raw column comparison since
  // Drizzle's typed operators compare a column to a value, not two columns.
  if (filters.lowStock) {
    clauses.push(sql`${products.currentStock} <= ${products.minStockAlert}`);
  }
  return clauses.length > 0 ? and(...clauses) : undefined;
}

export async function listProducts(pagination: PaginationParams, filters: ListFilters) {
  const where = buildWhere(filters);

  const [data, countResult] = await Promise.all([
    db.select().from(products).where(where).orderBy(products.name).limit(pagination.take).offset(pagination.skip),
    db.select({ count: sql<number>`count(*)::int` }).from(products).where(where),
  ]);

  return buildPaginatedResponse(data, countResult[0]?.count ?? 0, pagination);
}

export async function getProductById(id: string) {
  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      stockMovements: {
        orderBy: desc(stockMovements.createdAt),
        limit: 50,
        with: { createdBy: { columns: { id: true, name: true } } },
      },
    },
  });
  if (!product) throw ApiError.notFound("Product not found");
  return product;
}

export async function createProduct(input: CreateProductInput) {
  const [existing] = await db.select().from(products).where(eq(products.sku, input.sku)).limit(1);
  if (existing) throw ApiError.conflict(`A product with SKU "${input.sku}" already exists`);

  const [product] = await db
    .insert(products)
    .values({ ...input, unitPrice: String(input.unitPrice) })
    .returning();
  return product;
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  await getProductById(id);
  const { unitPrice, ...rest } = input;
  const [product] = await db
    .update(products)
    .set({ ...rest, ...(unitPrice !== undefined ? { unitPrice: String(unitPrice) } : {}), updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  return product;
}

/**
 * Records a stock movement and adjusts currentStock atomically.
 * OUT movements are rejected (400) if they would take stock negative.
 */
export async function recordStockMovement(productId: string, input: StockMovementInput, createdById: string) {
  return db.transaction(async (tx) => {
    const [product] = await tx.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) throw ApiError.notFound("Product not found");

    const delta = input.movementType === MOVEMENT_TYPES.IN ? input.quantity : -input.quantity;
    const newStock = product.currentStock + delta;

    if (newStock < 0) {
      throw ApiError.badRequest(
        `Insufficient stock: ${product.name} has ${product.currentStock} in stock, cannot remove ${input.quantity}`
      );
    }

    const [movement] = await tx
      .insert(stockMovements)
      .values({
        productId,
        quantity: input.quantity,
        movementType: input.movementType,
        reason: input.reason,
        createdById,
      })
      .returning();

    await tx.update(products).set({ currentStock: newStock, updatedAt: new Date() }).where(eq(products.id, productId));

    return movement;
  });
}
