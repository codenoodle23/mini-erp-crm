import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "./client";
import { customerFollowUps, customers, products, stockMovements, users } from "./schema";
import "dotenv/config";
const DEMO_PASSWORD = "Password123!";

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const [admin] = await db
    .insert(users)
    .values({ name: "Asha Admin", email: "admin@demo.com", passwordHash, role: "ADMIN" })
    .onConflictDoNothing({ target: users.email })
    .returning();
  const [sales] = await db
    .insert(users)
    .values({ name: "Sunil Sales", email: "sales@demo.com", passwordHash, role: "SALES" })
    .onConflictDoNothing({ target: users.email })
    .returning();
  const [warehouse] = await db
    .insert(users)
    .values({ name: "Wasim Warehouse", email: "warehouse@demo.com", passwordHash, role: "WAREHOUSE" })
    .onConflictDoNothing({ target: users.email })
    .returning();
  const [accounts] = await db
    .insert(users)
    .values({ name: "Anita Accounts", email: "accounts@demo.com", passwordHash, role: "ACCOUNTS" })
    .onConflictDoNothing({ target: users.email })
    .returning();

  // onConflictDoNothing returns [] if the row already existed — re-fetch so
  // the seed script is safely re-runnable.
  const salesUser = sales ?? (await db.select().from(users).where(eq(users.email, "sales@demo.com")).limit(1))[0];
  const warehouseUser =
    warehouse ?? (await db.select().from(users).where(eq(users.email, "warehouse@demo.com")).limit(1))[0];

  console.log("Users ready:", {
    admin: admin?.email ?? "admin@demo.com (already existed)",
    sales: salesUser?.email,
    warehouse: warehouseUser?.email,
    accounts: accounts?.email ?? "accounts@demo.com (already existed)",
  });

  if (!salesUser || !warehouseUser) {
    throw new Error("Could not resolve sales/warehouse seed users");
  }

  const existingCustomers = await db.query.customers.findMany({ limit: 1 });
  if (existingCustomers.length > 0) {
    console.log("Sample customers/products already exist — skipping.");
    console.log(`\nDemo login credentials (all use the same password): ${DEMO_PASSWORD}`);
    console.log("  admin@demo.com / sales@demo.com / warehouse@demo.com / accounts@demo.com");
    return;
  }

  const [customer1] = await db
    .insert(customers)
    .values({
      name: "Rajesh Traders",
      mobile: "9876543210",
      email: "rajesh@traders.example",
      businessName: "Rajesh Traders Pvt Ltd",
      gstNumber: "29ABCDE1234F1Z5",
      customerType: "DISTRIBUTOR",
      address: "12 MG Road, Bengaluru",
      status: "ACTIVE",
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: "Key distributor for the south region.",
      createdById: salesUser.id,
    })
    .returning();

  const [customer2] = await db
    .insert(customers)
    .values({
      name: "Priya Hardware Store",
      mobile: "9123456780",
      email: "priya@hardware.example",
      businessName: "Priya Hardware",
      customerType: "RETAIL",
      address: "45 Market Street, Mysuru",
      status: "LEAD",
      followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      notes: "Interested in bulk pricing for fasteners.",
      createdById: salesUser.id,
    })
    .returning();

  await db.insert(customerFollowUps).values({
    customerId: customer2.id,
    note: "Called to introduce the new product catalog. Asked to follow up next week.",
    followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    createdById: salesUser.id,
  });

  const insertedProducts = await db
    .insert(products)
    .values([
      {
        name: "Hex Bolt M8x40",
        sku: "HB-M8-40",
        category: "Fasteners",
        unitPrice: "3.50",
        currentStock: 5000,
        minStockAlert: 500,
        location: "Warehouse A - Rack 3",
      },
      {
        name: "Steel Washer 8mm",
        sku: "SW-8MM",
        category: "Fasteners",
        unitPrice: "0.75",
        currentStock: 200,
        minStockAlert: 300,
        location: "Warehouse A - Rack 4",
      },
      {
        name: "Cordless Drill 18V",
        sku: "CD-18V-PRO",
        category: "Power Tools",
        unitPrice: "4200.00",
        currentStock: 40,
        minStockAlert: 10,
        location: "Warehouse B - Shelf 1",
      },
    ])
    .returning();

  await db.insert(stockMovements).values(
    insertedProducts.map((p) => ({
      productId: p.id,
      quantity: p.currentStock,
      movementType: "IN" as const,
      reason: "Opening stock",
      createdById: warehouseUser.id,
    }))
  );

  console.log(`Seeded ${insertedProducts.length} products and 2 customers (customer1=${customer1.name}).`);
  console.log(`\nDemo login credentials (all use the same password): ${DEMO_PASSWORD}`);
  console.log("  admin@demo.com / sales@demo.com / warehouse@demo.com / accounts@demo.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
