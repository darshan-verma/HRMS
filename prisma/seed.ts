import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

/** Stock Super Admin – default password: SuperAdmin1! */
const STOCK_SUPER_ADMIN_EMAIL = "superadmin@example.com";
const STOCK_SUPER_ADMIN_PASSWORD = "SuperAdmin1!";
const STOCK_ORG_ID = "seed-org";

/** Default password for all seeded role users (for testing). */
const SEED_PASSWORD = "Password1!";

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
  const seedHash = await hashPassword(SEED_PASSWORD);

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

  // Role-specific users for multi-login testing (password: Password1!)
  const roleUsers = [
    { email: "employee@example.com", role: "EMPLOYEE" },
    { email: "manager@example.com", role: "MANAGER" },
    { email: "hrbp@example.com", role: "HRBP" },
    { email: "payroll@example.com", role: "PAYROLL_MANAGER" },
    { email: "hrmsadmin@example.com", role: "HRMS_ADMIN" }
  ];
  for (const { email, role } of roleUsers) {
    await prisma.user.upsert({
      where: {
        orgId_email: { orgId: organization.id, email }
      },
      update: { role, isActive: true, passwordHash: seedHash },
      create: {
        orgId: organization.id,
        email,
        passwordHash: seedHash,
        role,
        isActive: true
      }
    });
  }

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
  console.log("");
  console.log("One profile per role (email / password):");
  console.log("------------------------------------------");
  for (const { email, role } of roleUsers) {
    console.log("  %s\t%s\t%s", role.padEnd(16), email, SEED_PASSWORD);
  }
  console.log("------------------------------------------");
  console.log("Super Admin (optional): %s / %s", STOCK_SUPER_ADMIN_EMAIL, STOCK_SUPER_ADMIN_PASSWORD);
}

run()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
