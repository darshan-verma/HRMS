import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
import { z } from "zod";

const leaveSchema = z.object({
  orgId: z.string().min(1),
  employeeId: z.string().min(1),
  leavePolicyId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().max(500).optional(),
  documentKey: z.string().optional()
});

function parseDate(s: string): Date {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  return d;
}

/** Calendar days inclusive (sandwich rule: weekends between count as leave) */
function calendarDaysInclusive(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
}

export class LeaveService {
  /** Check overlapping leave for same employee in PENDING or APPROVED */
  async checkOverlap(
    orgId: string,
    employeeId: string,
    start: Date,
    end: Date,
    excludeRequestId?: string
  ): Promise<boolean> {
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        orgId,
        employeeId,
        status: { in: ["PENDING", "APPROVED"] },
        ...(excludeRequestId && { id: { not: excludeRequestId } }),
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start }
          }
        ]
      }
    });
    return !!overlapping;
  }

  async requestLeave(input: unknown) {
    const data = leaveSchema.parse(input);
    const start = parseDate(data.startDate);
    const end = parseDate(data.endDate);
    if (end < start) throw new Error("End date must be on or after start date");

    const [policy, foundBalance, hasOverlap] = await Promise.all([
      prisma.leavePolicy.findFirst({
        where: { id: data.leavePolicyId, orgId: data.orgId }
      }),
      prisma.leaveBalance.findUnique({
        where: {
          orgId_employeeId_leavePolicyId: {
            orgId: data.orgId,
            employeeId: data.employeeId,
            leavePolicyId: data.leavePolicyId
          }
        }
      }),
      this.checkOverlap(data.orgId, data.employeeId, start, end)
    ]);

    if (!policy) throw new Error("Leave policy not found");
    let balance = foundBalance;
    if (!balance) {
      // Create balance with 0 so employee can use this policy after running accrual
      const created = await prisma.leaveBalance.create({
        data: {
          orgId: data.orgId,
          employeeId: data.employeeId,
          leavePolicyId: data.leavePolicyId,
          availableDays: "0"
        }
      });
      balance = created;
    }
    const daysRequested = new Decimal(calendarDaysInclusive(start, end).toString());
    if (new Decimal(balance.availableDays.toString()).lt(daysRequested)) {
      throw new Error("Insufficient leave balance");
    }
    if (hasOverlap) throw new Error("Overlapping leave already exists for this period");

    return prisma.leaveRequest.create({
      data: {
        orgId: data.orgId,
        employeeId: data.employeeId,
        leavePolicyId: data.leavePolicyId,
        startDate: start,
        endDate: end,
        reason: data.reason ?? null,
        documentKey: data.documentKey ?? null,
        status: "PENDING",
        daysRequested: daysRequested.toFixed(2)
      },
      include: {
        employee: { select: { fullName: true, employeeCode: true } },
        leavePolicy: { select: { leaveType: true } }
      }
    });
  }

  async approveOrReject(input: {
    orgId: string;
    leaveRequestId: string;
    approverUserId: string;
    decision: "APPROVED" | "REJECTED";
    rejectionReason?: string;
  }) {
    const leave = await prisma.leaveRequest.findFirst({
      where: { id: input.leaveRequestId, orgId: input.orgId }
    });
    if (!leave) throw new Error("Leave request not found");
    if (leave.status !== "PENDING") throw new Error("Leave request is already processed");

    if (input.decision === "APPROVED") {
      const current = await prisma.leaveBalance.findUnique({
        where: {
          orgId_employeeId_leavePolicyId: {
            orgId: leave.orgId,
            employeeId: leave.employeeId,
            leavePolicyId: leave.leavePolicyId
          }
        }
      });
      if (!current) throw new Error("Leave balance not found");
      const nextAvailable = new Decimal(current.availableDays.toString())
        .minus(new Decimal(leave.daysRequested.toString()))
        .toFixed(2);
      const nextUsed = new Decimal(current.usedDays?.toString() ?? "0")
        .plus(new Decimal(leave.daysRequested.toString()))
        .toFixed(2);
      if (new Decimal(nextAvailable).lt(0)) throw new Error("Insufficient leave balance");

      const [updated] = await prisma.$transaction([
        prisma.leaveRequest.update({
          where: { id: leave.id },
          data: {
            status: "APPROVED",
            approvedByUserId: input.approverUserId,
            approvedAt: new Date(),
            rejectionReason: null
          }
        }),
        prisma.leaveBalance.update({
          where: {
            orgId_employeeId_leavePolicyId: {
              orgId: leave.orgId,
              employeeId: leave.employeeId,
              leavePolicyId: leave.leavePolicyId
            }
          },
          data: { availableDays: nextAvailable, usedDays: nextUsed }
        })
      ]);
      return updated;
    }

    return prisma.leaveRequest.update({
      where: { id: leave.id },
      data: {
        status: "REJECTED",
        approvedByUserId: input.approverUserId,
        approvedAt: new Date(),
        rejectionReason: input.rejectionReason ?? "No reason provided"
      }
    });
  }

  async listRequests(orgId: string, status?: string, employeeId?: string) {
    return prisma.leaveRequest.findMany({
      where: {
        orgId,
        ...(status ? { status } : {}),
        ...(employeeId ? { employeeId } : {})
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true, departmentId: true } },
        leavePolicy: { select: { id: true, leaveType: true } }
      },
      orderBy: [{ createdAt: "desc" }]
    });
  }

  async getRequest(orgId: string, id: string) {
    return prisma.leaveRequest.findFirst({
      where: { id, orgId },
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } },
        leavePolicy: true
      }
    });
  }

  async cancel(orgId: string, leaveRequestId: string) {
    const leave = await prisma.leaveRequest.findFirst({
      where: { id: leaveRequestId, orgId }
    });
    if (!leave) throw new Error("Leave request not found");
    if (leave.status !== "PENDING" && leave.status !== "APPROVED")
      throw new Error("Only PENDING or APPROVED leave can be cancelled");
    if (leave.status === "APPROVED") {
      const balance = await prisma.leaveBalance.findUnique({
        where: {
          orgId_employeeId_leavePolicyId: {
            orgId: leave.orgId,
            employeeId: leave.employeeId,
            leavePolicyId: leave.leavePolicyId
          }
        }
      });
      if (balance) {
        const nextAvailable = new Decimal(balance.availableDays.toString())
          .plus(new Decimal(leave.daysRequested.toString()))
          .toFixed(2);
        const nextUsed = new Decimal(balance.usedDays?.toString() ?? "0")
          .minus(new Decimal(leave.daysRequested.toString()))
          .toFixed(2);
        await prisma.leaveBalance.update({
          where: {
            orgId_employeeId_leavePolicyId: {
              orgId: leave.orgId,
              employeeId: leave.employeeId,
              leavePolicyId: leave.leavePolicyId
            }
          },
          data: { availableDays: nextAvailable, usedDays: nextUsed }
        });
      }
    }
    return prisma.leaveRequest.update({
      where: { id: leaveRequestId },
      data: { status: "CANCELLED" }
    });
  }

  async withdraw(orgId: string, leaveRequestId: string) {
    const leave = await prisma.leaveRequest.findFirst({
      where: { id: leaveRequestId, orgId }
    });
    if (!leave) throw new Error("Leave request not found");
    if (leave.status !== "PENDING") throw new Error("Only PENDING leave can be withdrawn");
    return prisma.leaveRequest.update({
      where: { id: leaveRequestId },
      data: { status: "WITHDRAWN" }
    });
  }

  async getStats(orgId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const [pendingCount, onLeaveToday, appliedThisMonth, totalEmployees] = await Promise.all([
      prisma.leaveRequest.count({ where: { orgId, status: "PENDING" } }),
      prisma.leaveRequest.count({
        where: {
          orgId,
          status: "APPROVED",
          startDate: { lte: today },
          endDate: { gte: today }
        }
      }),
      prisma.leaveRequest.count({
        where: {
          orgId,
          status: { in: ["PENDING", "APPROVED"] },
          createdAt: { gte: monthStart, lte: monthEnd }
        }
      }),
      prisma.employee.count({ where: { orgId, isDeleted: false } })
    ]);

    const approvedThisMonth = await prisma.leaveRequest.aggregate({
      where: {
        orgId,
        status: "APPROVED",
        approvedAt: { gte: monthStart, lte: monthEnd }
      },
      _sum: { daysRequested: true }
    });
    const avgLeaveUsage =
      totalEmployees > 0 && approvedThisMonth._sum.daysRequested
        ? new Decimal(approvedThisMonth._sum.daysRequested.toString())
            .div(totalEmployees)
            .toDecimalPlaces(1)
            .toString()
        : "0";

    return {
      pendingRequests: pendingCount,
      employeesOnLeaveToday: onLeaveToday,
      leaveAppliedThisMonth: appliedThisMonth,
      averageLeaveUsage: avgLeaveUsage
    };
  }

  async getCalendar(orgId: string, from: Date, to: Date, departmentId?: string) {
    const requests = await prisma.leaveRequest.findMany({
      where: {
        orgId,
        status: "APPROVED",
        startDate: { lte: to },
        endDate: { gte: from },
        ...(departmentId && { employee: { departmentId } })
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } },
        leavePolicy: { select: { leaveType: true } }
      }
    });
    return requests;
  }

  async getAnalytics(orgId: string, from?: Date, to?: Date, departmentId?: string) {
    const start = from ?? new Date(new Date().getFullYear(), 0, 1);
    const end = to ?? new Date();

    const requests = await prisma.leaveRequest.findMany({
      where: {
        orgId,
        status: "APPROVED",
        startDate: { gte: start, lte: end },
        ...(departmentId && { employee: { departmentId } })
      },
      include: {
        employee: { select: { id: true, fullName: true, departmentId: true } },
        leavePolicy: { select: { leaveType: true } }
      }
    });

    const byDepartment: Record<
      string,
      { departmentId: string | null; count: number; days: number }
    > = {};
    const byLeaveType: Record<string, { count: number; days: number }> = {};

    for (const r of requests) {
      const deptId = r.employee.departmentId ?? "uncategorized";
      if (!byDepartment[deptId])
        byDepartment[deptId] = {
          departmentId: r.employee.departmentId,
          count: 0,
          days: 0
        };
      byDepartment[deptId].count += 1;
      byDepartment[deptId].days += Number(r.daysRequested);

      const lt = r.leavePolicy.leaveType;
      if (!byLeaveType[lt]) byLeaveType[lt] = { count: 0, days: 0 };
      byLeaveType[lt].count += 1;
      byLeaveType[lt].days += Number(r.daysRequested);
    }

    return {
      from: start,
      to: end,
      totalRequests: requests.length,
      totalDays: requests.reduce((s, r) => s + Number(r.daysRequested), 0),
      byDepartment: Object.values(byDepartment),
      byLeaveType: Object.entries(byLeaveType).map(([leaveType, v]) => ({ leaveType, ...v }))
    };
  }
}
