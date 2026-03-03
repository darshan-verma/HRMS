import { prisma } from "@/lib/prisma";
import { getRedisClient } from "@/lib/redis";

export type HrMetrics = {
  attritionRate: number;
  headcountGrowth: number;
  payrollCostTrend: number;
  leaveTrend: number;
  diversityIndex: number;
};

export class AnalyticsService {
  async getOrgMetrics(orgId: string): Promise<HrMetrics> {
    const cacheKey = `analytics:summary:${orgId}`;
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as HrMetrics;

    const now = new Date();
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [activeEmployees, deletedEmployees, prevHeadcount, currentHeadcount, leaveCount, payrollRows] =
      await prisma.$transaction([
        prisma.employee.count({ where: { orgId, isDeleted: false } }),
        prisma.employee.count({ where: { orgId, isDeleted: true } }),
        prisma.employee.count({
          where: { orgId, isDeleted: false, createdAt: { lt: currentMonthStart } }
        }),
        prisma.employee.count({
          where: { orgId, isDeleted: false, createdAt: { gte: currentMonthStart } }
        }),
        prisma.leaveRequest.count({
          where: { orgId, createdAt: { gte: previousMonthStart } }
        }),
        prisma.payrollLedger.findMany({
          where: { orgId },
          orderBy: [{ createdAt: "desc" }],
          take: 24
        })
      ]);

    const attritionRate =
      activeEmployees + deletedEmployees === 0
        ? 0
        : Number(((deletedEmployees / (activeEmployees + deletedEmployees)) * 100).toFixed(2));

    const headcountGrowth =
      prevHeadcount === 0 ? 0 : Number(((currentHeadcount / prevHeadcount) * 100).toFixed(2));

    const payrollCostTrend =
      payrollRows.length === 0
        ? 0
        : Number(
            payrollRows
              .reduce((acc, row) => acc + Number(row.netAmount.toString()), 0)
              .toFixed(2)
          );

    const leaveTrend = Number(leaveCount.toFixed(2));

    const byDesignation = await prisma.employee.groupBy({
      by: ["designation"],
      where: { orgId, isDeleted: false },
      _count: { designation: true }
    });
    const diversityIndex =
      activeEmployees === 0
        ? 0
        : Number(((byDesignation.length / activeEmployees) * 100).toFixed(2));

    const metrics: HrMetrics = {
      attritionRate,
      headcountGrowth,
      payrollCostTrend,
      leaveTrend,
      diversityIndex
    };

    await redis.set(cacheKey, JSON.stringify(metrics), "EX", 300);
    return metrics;
  }

  async getHeadcountByDepartment(orgId: string): Promise<{ departmentId: string | null; departmentName: string; count: number }[]> {
    const grouped = await prisma.employee.groupBy({
      by: ["departmentId"],
      where: { orgId, isDeleted: false },
      _count: { departmentId: true }
    });
    const deptIds = [...new Set(grouped.map((g) => g.departmentId).filter(Boolean))] as string[];
    const departments = await prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { id: true, name: true }
    });
    const nameMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));
    return grouped.map((g) => ({
      departmentId: g.departmentId,
      departmentName: g.departmentId ? nameMap[g.departmentId] ?? "Unknown" : "Unassigned",
      count: g._count.departmentId
    }));
  }

  async exportCsv(orgId: string, type: "payroll" | "leave" | "headcount"): Promise<string> {
    if (type === "payroll") {
      const rows = await prisma.payrollLedger.findMany({ where: { orgId }, orderBy: { period: "asc" } });
      return [
        "period,employee_id,gross,deductions,net",
        ...rows.map((r) =>
          [r.period, r.employeeId, r.grossAmount.toString(), r.deductions.toString(), r.netAmount.toString()].join(",")
        )
      ].join("\n");
    }
    if (type === "leave") {
      const rows = await prisma.leaveRequest.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } });
      return [
        "request_id,employee_id,status,days_requested",
        ...rows.map((r) => [r.id, r.employeeId, r.status, r.daysRequested.toString()].join(","))
      ].join("\n");
    }
    const rows = await prisma.employee.findMany({
      where: { orgId },
      select: { id: true, employeeCode: true, isDeleted: true }
    });
    return [
      "employee_id,employee_code,is_active",
      ...rows.map((r) => [r.id, r.employeeCode, String(!r.isDeleted)].join(","))
    ].join("\n");
  }
}
