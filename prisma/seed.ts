import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run(): Promise<void> {
  const orgName = process.env.SEED_ORG_NAME ?? "Acme HRMS";
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";

  const organization = await prisma.organization.upsert({
    where: { id: "seed-org" },
    update: { name: orgName },
    create: { id: "seed-org", name: orgName }
  });

  await prisma.user.upsert({
    where: {
      orgId_email: {
        orgId: organization.id,
        email: adminEmail
      }
    },
    update: { role: "SUPER_ADMIN", isActive: true },
    create: {
      orgId: organization.id,
      email: adminEmail,
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
}

run()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
