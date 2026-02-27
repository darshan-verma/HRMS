import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
import { z } from "zod";

const salaryStructureSchema = z.object({
  orgId: z.string().min(1),
  employeeId: z.string().min(1),
  basic: z.string().min(1),
  hra: z.string().min(1),
  specialAllowance: z.string().min(1),
  otherAllowance: z.string().optional(),
  epfApplicable: z.boolean().default(true),
  esiApplicable: z.boolean().default(false),
  professionalTax: z.string().optional(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional()
});

type SalaryStructureDelegate = {
  create(args: unknown): Promise<{ id: string }>;
  findMany(args: unknown): Promise<unknown[]>;
};

function salaryStructureDelegate(): SalaryStructureDelegate {
  return (prisma as unknown as { salaryStructure: SalaryStructureDelegate }).salaryStructure;
}

export class SalaryStructureService {
  async create(input: unknown) {
    const data = salaryStructureSchema.parse(input);
    return salaryStructureDelegate().create({
      data: {
        orgId: data.orgId,
        employeeId: data.employeeId,
        basic: new Decimal(data.basic).toFixed(2),
        hra: new Decimal(data.hra).toFixed(2),
        specialAllowance: new Decimal(data.specialAllowance).toFixed(2),
        otherAllowance: new Decimal(data.otherAllowance ?? "0").toFixed(2),
        epfApplicable: data.epfApplicable,
        esiApplicable: data.esiApplicable,
        professionalTax: new Decimal(data.professionalTax ?? "0").toFixed(2),
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null
      }
    });
  }

  async list(orgId: string, employeeId?: string) {
    return salaryStructureDelegate().findMany({
      where: {
        orgId,
        ...(employeeId ? { employeeId } : {})
      },
      orderBy: [{ effectiveFrom: "desc" }]
    });
  }
}
