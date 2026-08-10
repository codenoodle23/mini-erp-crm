import { and, gte, lt, sql } from "drizzle-orm";
import { challans } from "../db/schema";
import { db } from "../db/client";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Generates a challan number of the form CH-YYYYMMDD-0001, scoped to the
 * current day. Runs inside the caller's transaction so the count-then-insert
 * is atomic with respect to the challan row being created; on the rare
 * unique-constraint race, the caller can retry.
 */
export async function generateChallanNumber(tx: Tx): Promise<string> {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [{ count }] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(challans)
    .where(and(gte(challans.createdAt, startOfDay), lt(challans.createdAt, endOfDay)));

  const sequence = String(count + 1).padStart(4, "0");
  return `CH-${datePart}-${sequence}`;
}
