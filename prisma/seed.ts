import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

/** Stock Super Admin – default password: SuperAdmin1! */
const STOCK_SUPER_ADMIN_EMAIL = "superadmin@example.com";
const STOCK_SUPER_ADMIN_PASSWORD = "SuperAdmin1!";
const STOCK_ORG_ID = "seed-org";

async function run(): Promise<void> {
  const orgName = process.env.SEED_ORG_NAME ?? "Acme HRMS";
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin1!";

  const organization = await prisma.organization.upsert({
    where: { id: STOCK_ORG_ID },
    update: { name: orgName },
    create: { id: STOCK_ORG_ID, name: orgName }
  });

  const adminHash = await hashPassword(adminPassword);
  const superAdminHash = await hashPassword(STOCK_SUPER_ADMIN_PASSWORD);

  // Seed admin from env (e.g. admin@example.com)
  await prisma.user.upsert({
    where: {
      orgId_email: {
        orgId: organization.id,
        email: adminEmail
      }
    },
    update: { role: "SUPER_ADMIN", isActive: true, passwordHash: adminHash },
    create: {
      orgId: organization.id,
      email: adminEmail,
      passwordHash: adminHash,
      role: "SUPER_ADMIN",
      isActive: true
    }
  });

  // Stock Super Admin – fixed credentials for initial login
  await prisma.user.upsert({
    where: {
      orgId_email: {
        orgId: organization.id,
        email: STOCK_SUPER_ADMIN_EMAIL
      }
    },
    update: { role: "SUPER_ADMIN", isActive: true, passwordHash: superAdminHash },
    create: {
      orgId: organization.id,
      email: STOCK_SUPER_ADMIN_EMAIL,
      passwordHash: superAdminHash,
      role: "SUPER_ADMIN",
      isActive: true
    }
  });

  // Seed departments so employees can be assigned
  const departmentNames = ["Engineering", "Product", "Human Resources", "Finance"];
  for (const name of departmentNames) {
    await prisma.department.upsert({
      where: {
        orgId_name: { orgId: organization.id, name }
      },
      update: {},
      create: { orgId: organization.id, name }
    });
  }

  console.log("Seed complete.");
  console.log("Stock Super Admin: email=%s, password=%s", STOCK_SUPER_ADMIN_EMAIL, STOCK_SUPER_ADMIN_PASSWORD);
}

run()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
