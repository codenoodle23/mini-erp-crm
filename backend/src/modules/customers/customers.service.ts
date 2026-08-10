import { and, desc, eq, ilike, or, sql, SQL } from "drizzle-orm";
import { db } from "../../db/client";
import { customerFollowUps, customers, CustomerStatus, CustomerType } from "../../db/schema";
import { ApiError } from "../../utils/ApiError";
import { buildPaginatedResponse, PaginationParams } from "../../utils/pagination";
import { AddFollowUpInput, CreateCustomerInput, UpdateCustomerInput } from "./customers.schema";

interface ListFilters {
  search?: string;
  status?: CustomerStatus;
  customerType?: CustomerType;
}

function buildWhere(filters: ListFilters): SQL | undefined {
  const clauses: SQL[] = [];
  if (filters.status) clauses.push(eq(customers.status, filters.status));
  if (filters.customerType) clauses.push(eq(customers.customerType, filters.customerType));
  if (filters.search) {
    const term = `%${filters.search}%`;
    const searchClause = or(
      ilike(customers.name, term),
      ilike(customers.mobile, term),
      ilike(customers.email, term),
      ilike(customers.businessName, term)
    );
    if (searchClause) clauses.push(searchClause);
  }
  return clauses.length > 0 ? and(...clauses) : undefined;
}

export async function listCustomers(pagination: PaginationParams, filters: ListFilters) {
  const where = buildWhere(filters);

  const [data, countResult] = await Promise.all([
    db.query.customers.findMany({
      where,
      limit: pagination.take,
      offset: pagination.skip,
      orderBy: desc(customers.createdAt),
      with: { createdBy: { columns: { id: true, name: true } } },
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(customers).where(where),
  ]);

  return buildPaginatedResponse(data, countResult[0]?.count ?? 0, pagination);
}

export async function getCustomerById(id: string) {
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, id),
    with: {
      createdBy: { columns: { id: true, name: true } },
      followUps: {
        orderBy: desc(customerFollowUps.createdAt),
        with: { createdBy: { columns: { id: true, name: true } } },
      },
      challans: {
        orderBy: (challansTable, { desc: d }) => d(challansTable.createdAt),
        columns: { id: true, challanNumber: true, status: true, totalQuantity: true, createdAt: true },
      },
    },
  });
  if (!customer) throw ApiError.notFound("Customer not found");
  return customer;
}

export async function createCustomer(input: CreateCustomerInput, createdById: string) {
  const [customer] = await db
    .insert(customers)
    .values({ ...input, createdById })
    .returning();
  return customer;
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  await getCustomerById(id); // 404s if missing
  const [customer] = await db
    .update(customers)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning();
  return customer;
}

export async function addFollowUp(customerId: string, input: AddFollowUpInput, createdById: string) {
  await getCustomerById(customerId); // 404s if missing

  return db.transaction(async (tx) => {
    const [followUp] = await tx
      .insert(customerFollowUps)
      .values({ customerId, note: input.note, followUpDate: input.followUpDate, createdById })
      .returning();

    // Keep the customer's headline follow-up date in sync with the latest note.
    if (input.followUpDate) {
      await tx
        .update(customers)
        .set({ followUpDate: input.followUpDate, updatedAt: new Date() })
        .where(eq(customers.id, customerId));
    }

    return followUp;
  });
}
