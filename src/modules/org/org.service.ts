import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createOrgSchema = z.object({
  name: z.string().min(2)
});

export class OrganizationService {
  async create(input: unknown) {
    const data = createOrgSchema.parse(input);
    return prisma.organization.create({ data: { name: data.name } });
  }
}
