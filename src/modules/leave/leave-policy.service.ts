import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
import { z } from "zod";

const policySchema = z.object({
  orgId: z.string().min(1),
  leaveType: z.string().min(2),
  annualQuota: z.number().int().min(0),
  carryForward: z.boolean().default(false),
  accrualPerMonth: z.string().min(1)
});

export class LeavePolicyService {
  async createPolicy(input: unknown) {
    const data = policySchema.parse(input);
    return prisma.leavePolicy.create({
      data: {
        orgId: data.orgId,
        leaveType: data.leaveType,
        annualQuota: data.annualQuota,
        carryForward: data.carryForward,
        accrualPerMonth: new Decimal(data.accrualPerMonth).toFixed(2)
      }
    });
  }

  async listPolicies(orgId: string) {
    return prisma.leavePolicy.findMany({
      where: { orgId },
      orderBy: [{ leaveType: "asc" }]
    });
  }

  async runMonthlyAccrual(orgId: string) {
    const [employees, policies] = await prisma.$transaction([
      prisma.employee.findMany({
        where: { orgId, isDeleted: false },
        select: { id: true }
      }),
      prisma.leavePolicy.findMany({
        where: { orgId },
        select: { id: true, accrualPerMonth: true }
      })
    ]);

    let upserts = 0;
    for (const employee of employees) {
      for (const policy of policies) {
        const existing = await prisma.leaveBalance.findUnique({
          where: {
            orgId_employeeId_leavePolicyId: {
              orgId,
              employeeId: employee.id,
              leavePolicyId: policy.id
            }
          }
        });

        const nextValue = new Decimal(existing?.availableDays?.toString() ?? "0")
          .plus(new Decimal(policy.accrualPerMonth.toString()))
          .toFixed(2);

        await prisma.leaveBalance.upsert({
          where: {
            orgId_employeeId_leavePolicyId: {
              orgId,
              employeeId: employee.id,
              leavePolicyId: policy.id
            }
          },
          update: { availableDays: nextValue },
          create: {
            orgId,
            employeeId: employee.id,
            leavePolicyId: policy.id,
            availableDays: nextValue
          }
        });
        upserts += 1;
      }
    }

    return { employees: employees.length, policies: policies.length, updates: upserts };
  }
}
