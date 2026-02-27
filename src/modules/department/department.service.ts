import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createDepartmentSchema = z.object({
  orgId: z.string().min(1),
  name: z.string().min(2),
  parentId: z.string().optional()
});

export class DepartmentService {
  async create(input: unknown) {
    const data = createDepartmentSchema.parse(input);
    return prisma.department.create({
      data: {
        orgId: data.orgId,
        name: data.name,
        parentId: data.parentId
      }
    });
  }

  async listByOrg(orgId: string) {
    return prisma.department.findMany({
      where: { orgId },
      orderBy: [{ parentId: "asc" }, { name: "asc" }]
    });
  }
}
