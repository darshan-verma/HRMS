import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
import { z } from "zod";

const leaveSchema = z.object({
  orgId: z.string().min(1),
  employeeId: z.string().min(1),
  leavePolicyId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().max(500).optional()
});

export class LeaveService {
  async requestLeave(input: unknown) {
    const data = leaveSchema.parse(input);
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffInDays = new Decimal(
      Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1))
    );

    const balance = await prisma.leaveBalance.findUnique({
      where: {
        orgId_employeeId_leavePolicyId: {
          orgId: data.orgId,
          employeeId: data.employeeId,
          leavePolicyId: data.leavePolicyId
        }
      }
    });
    if (!balance || new Decimal(balance.availableDays.toString()).lt(diffInDays)) {
      throw new Error("Insufficient leave balance");
    }

    return prisma.leaveRequest.create({
      data: {
        orgId: data.orgId,
        employeeId: data.employeeId,
        leavePolicyId: data.leavePolicyId,
        startDate: start,
        endDate: end,
        reason: data.reason,
        status: "PENDING",
        daysRequested: diffInDays.toFixed(2)
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
      where: {
        id: input.leaveRequestId,
        orgId: input.orgId
      }
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
      const next = new Decimal(current.availableDays.toString())
        .minus(new Decimal(leave.daysRequested.toString()))
        .toFixed(2);
      if (new Decimal(next).lt(0)) throw new Error("Insufficient leave balance");

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
          data: { availableDays: next }
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

  async listRequests(orgId: string, status?: string) {
    return prisma.leaveRequest.findMany({
      where: {
        orgId,
        ...(status ? { status } : {})
      },
      include: {
        employee: { select: { fullName: true, employeeCode: true } },
        leavePolicy: { select: { leaveType: true } }
      },
      orderBy: [{ createdAt: "desc" }]
    });
  }
}
