import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
import { z } from "zod";

const policyCreateSchema = z.object({
  orgId: z.string().min(1),
  leaveType: z.string().min(2),
  annualQuota: z.number().int().min(0),
  carryForward: z.boolean().default(false),
  accrualPerMonth: z.union([z.string(), z.number()]),
  leaveCycle: z.enum(["CALENDAR_YEAR", "FINANCIAL_YEAR"]).default("CALENDAR_YEAR"),
  eligibilityProbationMonths: z.number().int().min(0).default(0),
  carryForwardLimit: z.number().int().min(0).optional(),
  carryForwardExpiryMonths: z.number().int().min(0).optional(),
  sandwichRuleCountWeekends: z.boolean().default(true),
  accrualType: z.enum(["MONTHLY", "QUARTERLY", "YEARLY", "IMMEDIATE"]).default("MONTHLY"),
  encashmentRate: z.union([z.string(), z.number()]).optional(),
  maxEncashableDays: z.number().int().min(0).optional()
});

function toDecimalString(value: string | number): string {
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num) || num < 0) throw new Error("Invalid number");
  return new Decimal(num).toFixed(2);
}

const policyUpdateSchema = policyCreateSchema.partial().omit({ orgId: true });

export class LeavePolicyService {
  async createPolicy(input: unknown) {
    const data = policyCreateSchema.parse(input);
    const accrualStr = toDecimalString(data.accrualPerMonth);
    const payload = {
      orgId: data.orgId,
      leaveType: data.leaveType,
      annualQuota: data.annualQuota,
      carryForward: data.carryForward,
      accrualPerMonth: accrualStr,
      leaveCycle: data.leaveCycle,
      eligibilityProbationMonths: data.eligibilityProbationMonths,
      carryForwardLimit: data.carryForwardLimit ?? null,
      carryForwardExpiryMonths: data.carryForwardExpiryMonths ?? null,
      sandwichRuleCountWeekends: data.sandwichRuleCountWeekends,
      accrualType: data.accrualType,
      encashmentRate: data.encashmentRate != null ? toDecimalString(data.encashmentRate) : null,
      maxEncashableDays: data.maxEncashableDays ?? null
    };
    const policy = await prisma.leavePolicy.create({
      data: payload as Parameters<typeof prisma.leavePolicy.create>[0]["data"]
    });

    // Create leave balance for every employee so they can use this policy (initial 0; run accrual to add)
    const employees = await prisma.employee.findMany({
      where: { orgId: data.orgId, isDeleted: false },
      select: { id: true }
    });
    for (const emp of employees) {
      await prisma.leaveBalance.upsert({
        where: {
          orgId_employeeId_leavePolicyId: {
            orgId: data.orgId,
            employeeId: emp.id,
            leavePolicyId: policy.id
          }
        },
        update: {},
        create: {
          orgId: data.orgId,
          employeeId: emp.id,
          leavePolicyId: policy.id,
          availableDays: "0"
        }
      });
    }

    return policy;
  }

  async getPolicy(orgId: string, id: string) {
    return prisma.leavePolicy.findFirst({
      where: { id, orgId }
    });
  }

  async updatePolicy(orgId: string, id: string, input: unknown) {
    const data = policyUpdateSchema.parse(input);
    const updateData = {
      ...(data.leaveType !== undefined && { leaveType: data.leaveType }),
      ...(data.annualQuota !== undefined && { annualQuota: data.annualQuota }),
      ...(data.carryForward !== undefined && { carryForward: data.carryForward }),
      ...(data.accrualPerMonth !== undefined && {
        accrualPerMonth: toDecimalString(data.accrualPerMonth)
      }),
      ...(data.leaveCycle !== undefined && { leaveCycle: data.leaveCycle }),
      ...(data.eligibilityProbationMonths !== undefined && {
        eligibilityProbationMonths: data.eligibilityProbationMonths
      }),
      ...(data.carryForwardLimit !== undefined && { carryForwardLimit: data.carryForwardLimit }),
      ...(data.carryForwardExpiryMonths !== undefined && {
        carryForwardExpiryMonths: data.carryForwardExpiryMonths
      }),
      ...(data.sandwichRuleCountWeekends !== undefined && {
        sandwichRuleCountWeekends: data.sandwichRuleCountWeekends
      }),
      ...(data.accrualType !== undefined && { accrualType: data.accrualType }),
      ...(data.encashmentRate !== undefined && {
        encashmentRate: data.encashmentRate != null ? toDecimalString(data.encashmentRate) : null
      }),
      ...(data.maxEncashableDays !== undefined && { maxEncashableDays: data.maxEncashableDays })
    };
    return prisma.leavePolicy.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.leavePolicy.update>[0]["data"]
    });
  }

  async listPolicies(orgId: string) {
    return prisma.leavePolicy.findMany({
      where: { orgId },
      orderBy: [{ leaveType: "asc" }]
    });
  }

  async runMonthlyAccrual(orgId: string, year: number, month: number) {
    const policies = await prisma.leavePolicy.findMany({
      where: { orgId }
    });
    const employees = await prisma.employee.findMany({
      where: { orgId, isDeleted: false },
      select: { id: true }
    });

    let updates = 0;
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

        const accrualAmount = new Decimal(policy.accrualPerMonth.toString());
        const nextAvailable = new Decimal(existing?.availableDays?.toString() ?? "0")
          .plus(accrualAmount)
          .toFixed(2);

        await prisma.leaveBalance.upsert({
          where: {
            orgId_employeeId_leavePolicyId: {
              orgId,
              employeeId: employee.id,
              leavePolicyId: policy.id
            }
          },
          update: { availableDays: nextAvailable },
          create: {
            orgId,
            employeeId: employee.id,
            leavePolicyId: policy.id,
            availableDays: nextAvailable
          }
        });

        // Log accrual when LeaveAccrualLog table exists (after migration 20260302000000_leave_industry_grade)
        const prismaAny = prisma as unknown as { leaveAccrualLog?: { create: (arg: { data: Record<string, unknown> }) => Promise<unknown> } };
        if (prismaAny.leaveAccrualLog?.create) {
          await prismaAny.leaveAccrualLog.create({
            data: {
              orgId,
              employeeId: employee.id,
              leavePolicyId: policy.id,
              accrualType: "MONTHLY",
              amount: accrualAmount.toFixed(2),
              cycleMonth: month,
              cycleYear: year
            }
          });
        }
        updates += 1;
      }
    }

    return { employees: employees.length, policies: policies.length, updates };
  }
}
