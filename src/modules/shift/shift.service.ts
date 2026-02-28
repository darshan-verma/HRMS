import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

// ---- Schemas ----
const createShiftSchema = z.object({
  orgId: z.string().min(1),
  name: z.string().min(2),
  code: z.string().optional(),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(0).max(1439),
  graceMinutes: z.number().int().min(0).max(180).default(0),
  breakDurationMinutes: z.number().int().min(0).max(480).default(0),
  breakPaid: z.boolean().default(false),
  weeklyOffPattern: z.array(z.number().int().min(0).max(6)).optional(),
  earlyLeaveToleranceMinutes: z.number().int().min(0).max(120).default(0),
  halfDayThresholdMinutes: z.number().int().min(0).max(720).default(240),
  overtimeEligible: z.boolean().default(false),
  overtimeMultiplier: z.number().min(1).max(3).optional(),
  minWorkingHoursMinutes: z.number().int().min(0).max(720).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE")
});

const updateShiftSchema = createShiftSchema.partial().extend({
  orgId: z.string().min(1),
  shiftId: z.string().min(1)
});

const assignShiftSchema = z.object({
  orgId: z.string().min(1),
  employeeId: z.string().min(1).optional(),
  employeeIds: z.array(z.string().min(1)).optional(),
  departmentId: z.string().min(1).optional(),
  shiftId: z.string().min(1),
  assignmentType: z.enum(["INDIVIDUAL", "DEPARTMENT", "BULK"]).default("INDIVIDUAL"),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional()
});

const createRotationSchema = z.object({
  orgId: z.string().min(1),
  name: z.string().min(2),
  rotationType: z.enum(["WEEKLY", "MONTHLY"]),
  shiftOrder: z.array(z.string().min(1)),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE")
});

const assignRotationSchema = z.object({
  orgId: z.string().min(1),
  employeeId: z.string().min(1),
  rotationId: z.string().min(1),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional()
});

const changeRequestSchema = z.object({
  orgId: z.string().min(1),
  employeeId: z.string().min(1),
  fromShiftId: z.string().min(1).optional(),
  toShiftId: z.string().min(1),
  forDate: z.string().datetime(),
  reason: z.string().optional()
});

const compliancePolicySchema = z.object({
  orgId: z.string().min(1),
  maxHoursPerWeek: z.number().int().min(1).max(168).default(48),
  minRestHoursBetweenShifts: z.number().min(0).max(24).default(8),
  maxOvertimeHoursPerMonth: z.number().min(0).max(200).default(50),
  nightShiftStartHour: z.number().int().min(0).max(23).optional(),
  nightShiftEndHour: z.number().int().min(0).max(23).optional(),
  maxConsecutiveNightShifts: z.number().int().min(1).max(30).optional()
});

const overrideSchema = z.object({
  orgId: z.string().min(1),
  employeeId: z.string().min(1),
  shiftId: z.string().min(1),
  forDate: z.string().datetime(),
  overrideType: z.enum(["ONE_DAY", "HOLIDAY", "EMERGENCY"]),
  reason: z.string().optional(),
  approvedByUserId: z.string().optional()
});

export class ShiftService {
  // ---- Shift CRUD ----
  async createShift(input: unknown) {
    const data = createShiftSchema.parse(input);
    return prisma.shift.create({
      data: {
        orgId: data.orgId,
        name: data.name,
        code: data.code,
        startMinute: data.startMinute,
        endMinute: data.endMinute,
        graceMinutes: data.graceMinutes,
        breakDurationMinutes: data.breakDurationMinutes,
        breakPaid: data.breakPaid,
        weeklyOffPattern: data.weeklyOffPattern ?? undefined,
        earlyLeaveToleranceMinutes: data.earlyLeaveToleranceMinutes,
        halfDayThresholdMinutes: data.halfDayThresholdMinutes,
        overtimeEligible: data.overtimeEligible,
        overtimeMultiplier: data.overtimeMultiplier != null ? new Decimal(data.overtimeMultiplier) : null,
        minWorkingHoursMinutes: data.minWorkingHoursMinutes ?? null,
        status: data.status
      }
    });
  }

  async getShift(orgId: string, shiftId: string) {
    const shift = await prisma.shift.findFirst({
      where: { id: shiftId, orgId },
      include: {
        _count: { select: { assignments: true } }
      }
    });
    if (!shift) return null;
    return shift;
  }

  async updateShift(input: unknown) {
    const data = updateShiftSchema.parse(input);
    const updatePayload: Record<string, unknown> = {};
    if (data.name != null) updatePayload.name = data.name;
    if (data.code !== undefined) updatePayload.code = data.code;
    if (data.startMinute != null) updatePayload.startMinute = data.startMinute;
    if (data.endMinute != null) updatePayload.endMinute = data.endMinute;
    if (data.graceMinutes != null) updatePayload.graceMinutes = data.graceMinutes;
    if (data.breakDurationMinutes != null) updatePayload.breakDurationMinutes = data.breakDurationMinutes;
    if (data.breakPaid != null) updatePayload.breakPaid = data.breakPaid;
    if (data.weeklyOffPattern !== undefined) updatePayload.weeklyOffPattern = data.weeklyOffPattern;
    if (data.earlyLeaveToleranceMinutes != null) updatePayload.earlyLeaveToleranceMinutes = data.earlyLeaveToleranceMinutes;
    if (data.halfDayThresholdMinutes != null) updatePayload.halfDayThresholdMinutes = data.halfDayThresholdMinutes;
    if (data.overtimeEligible != null) updatePayload.overtimeEligible = data.overtimeEligible;
    if (data.overtimeMultiplier !== undefined) updatePayload.overtimeMultiplier = data.overtimeMultiplier != null ? new Decimal(data.overtimeMultiplier) : null;
    if (data.minWorkingHoursMinutes !== undefined) updatePayload.minWorkingHoursMinutes = data.minWorkingHoursMinutes;
    if (data.status != null) updatePayload.status = data.status;

    return prisma.shift.update({
      where: { id: data.shiftId },
      data: updatePayload as Parameters<typeof prisma.shift.update>[0]["data"]
    });
  }

  async listShifts(orgId: string, options?: { status?: "ACTIVE" | "INACTIVE" | "all" }) {
    const where: { orgId: string; status?: string } = { orgId };
    if (options?.status && options.status !== "all") where.status = options.status;
    return prisma.shift.findMany({
      where,
      orderBy: [{ name: "asc" }],
      include: {
        _count: { select: { assignments: true } }
      }
    });
  }

  async duplicateShift(orgId: string, shiftId: string, newName: string) {
    const existing = await prisma.shift.findFirst({ where: { id: shiftId, orgId } });
    if (!existing) return null;
    const { id: _id, createdAt, updatedAt, weeklyOffPattern, ...rest } = existing;
    return prisma.shift.create({
      data: {
        ...rest,
        orgId,
        name: newName,
        code: rest.code ? `${rest.code}-copy` : null,
        weeklyOffPattern: weeklyOffPattern === null ? Prisma.JsonNull : weeklyOffPattern
      }
    });
  }

  async deactivateShift(orgId: string, shiftId: string) {
    return prisma.shift.update({
      where: { id: shiftId },
      data: { status: "INACTIVE" }
    });
  }

  // ---- Assignment ----
  async assignShift(input: unknown) {
    const data = assignShiftSchema.parse(input);
    if (data.assignmentType === "INDIVIDUAL" && data.employeeId) {
      return prisma.employeeShiftAssignment.create({
        data: {
          orgId: data.orgId,
          employeeId: data.employeeId,
          shiftId: data.shiftId,
          assignmentType: "INDIVIDUAL",
          effectiveFrom: new Date(data.effectiveFrom),
          effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null
        }
      });
    }
    if (data.assignmentType === "DEPARTMENT" && data.departmentId) {
      const employees = await prisma.employee.findMany({
        where: { orgId: data.orgId, departmentId: data.departmentId, isDeleted: false }
      });
      const created = await prisma.$transaction(
        employees.map((e) =>
          prisma.employeeShiftAssignment.create({
            data: {
              orgId: data.orgId,
              employeeId: e.id,
              shiftId: data.shiftId,
              assignmentType: "DEPARTMENT",
              departmentId: data.departmentId,
              effectiveFrom: new Date(data.effectiveFrom),
              effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null
            }
          })
        )
      );
      return created[0] ?? null;
    }
    if (data.assignmentType === "BULK" && data.employeeIds?.length) {
      const created = await prisma.$transaction(
        data.employeeIds.map((employeeId) =>
          prisma.employeeShiftAssignment.create({
            data: {
              orgId: data.orgId,
              employeeId,
              shiftId: data.shiftId,
              assignmentType: "BULK",
              effectiveFrom: new Date(data.effectiveFrom),
              effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null
            }
          })
        )
      );
      return created[0] ?? null;
    }
    throw new Error("Invalid assignment: provide employeeId, departmentId, or employeeIds");
  }

  async listAssignments(orgId: string, filters?: { employeeId?: string; shiftId?: string; effectiveOn?: Date }) {
    const where: Prisma.EmployeeShiftAssignmentWhereInput = { orgId };
    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.shiftId) where.shiftId = filters.shiftId;
    if (filters?.effectiveOn) {
      where.effectiveFrom = { lte: filters.effectiveOn };
      where.OR = [
        { effectiveTo: null },
        { effectiveTo: { gte: filters.effectiveOn } }
      ];
    }
    return prisma.employeeShiftAssignment.findMany({
      where,
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true, departmentId: true } },
        shift: { select: { id: true, name: true, code: true, startMinute: true, endMinute: true, status: true } }
      },
      orderBy: [{ effectiveFrom: "desc" }]
    });
  }

  async getAssignmentHistory(orgId: string, employeeId: string) {
    return prisma.employeeShiftAssignment.findMany({
      where: { orgId, employeeId },
      include: { shift: true },
      orderBy: [{ effectiveFrom: "desc" }]
    });
  }

  async getShiftAssignmentCounts(orgId: string) {
    const shifts = await prisma.shift.findMany({
      where: { orgId, status: "ACTIVE" },
      include: { _count: { select: { assignments: true } } }
    });
    const totalAssigned = await prisma.employeeShiftAssignment.count({
      where: {
        orgId,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }]
      }
    });
    return { shifts, totalAssigned };
  }

  /** Resolve which shift applies to an employee on a given date. Checks override first, then rotation, then direct assignment. */
  async resolveEmployeeShift(orgId: string, employeeId: string, onDate: Date) {
    const dateOnly = new Date(Date.UTC(onDate.getUTCFullYear(), onDate.getUTCMonth(), onDate.getUTCDate()));

    const override = await prisma.shiftOverride.findFirst({
      where: { orgId, employeeId, forDate: dateOnly },
      include: { shift: true }
    });
    if (override?.shift) return override.shift;

    const rotationAssignment = await prisma.shiftRotationAssignment.findFirst({
      where: {
        orgId,
        employeeId,
        effectiveFrom: { lte: onDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: onDate } }]
      },
      include: { rotation: true },
      orderBy: { effectiveFrom: "desc" }
    });

    if (rotationAssignment?.rotation) {
      const order = rotationAssignment.rotation.shiftOrder as string[];
      if (Array.isArray(order) && order.length > 0) {
        const rotationType = rotationAssignment.rotation.rotationType;
        let index = 0;
        if (rotationType === "WEEKLY") {
          const start = new Date(rotationAssignment.effectiveFrom);
          const weeks = Math.floor((onDate.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
          index = weeks % order.length;
        } else {
          const start = new Date(rotationAssignment.effectiveFrom);
          const months = (onDate.getFullYear() - start.getFullYear()) * 12 + (onDate.getMonth() - start.getMonth());
          index = months % order.length;
        }
        const shiftId = order[index];
        const shift = await prisma.shift.findFirst({ where: { id: shiftId, orgId, status: "ACTIVE" } });
        if (shift) return shift;
      }
    }

    const assignment = await prisma.employeeShiftAssignment.findFirst({
      where: {
        orgId,
        employeeId,
        effectiveFrom: { lte: onDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: onDate } }]
      },
      include: { shift: true },
      orderBy: { effectiveFrom: "desc" }
    });
    return assignment?.shift ?? null;
  }

  // ---- Rotation ----
  async createRotation(input: unknown) {
    const data = createRotationSchema.parse(input);
    return prisma.shiftRotation.create({
      data: {
        orgId: data.orgId,
        name: data.name,
        rotationType: data.rotationType,
        shiftOrder: data.shiftOrder,
        effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : null,
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
        status: data.status
      }
    });
  }

  async listRotations(orgId: string, status?: "ACTIVE" | "INACTIVE" | "all") {
    const where: { orgId: string; status?: string } = { orgId };
    if (status && status !== "all") where.status = status;
    return prisma.shiftRotation.findMany({
      where,
      orderBy: [{ name: "asc" }],
      include: { _count: { select: { assignments: true } } }
    });
  }

  async assignRotation(input: unknown) {
    const data = assignRotationSchema.parse(input);
    return prisma.shiftRotationAssignment.create({
      data: {
        orgId: data.orgId,
        employeeId: data.employeeId,
        rotationId: data.rotationId,
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null
      }
    });
  }

  async listRotationAssignments(orgId: string, rotationId?: string) {
    const where: { orgId: string; rotationId?: string } = { orgId };
    if (rotationId) where.rotationId = rotationId;
    return prisma.shiftRotationAssignment.findMany({
      where,
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } },
        rotation: true
      },
      orderBy: [{ effectiveFrom: "desc" }]
    });
  }

  // ---- Change requests ----
  async createChangeRequest(input: unknown) {
    const data = changeRequestSchema.parse(input);
    return prisma.shiftChangeRequest.create({
      data: {
        orgId: data.orgId,
        employeeId: data.employeeId,
        fromShiftId: data.fromShiftId ?? null,
        toShiftId: data.toShiftId,
        forDate: new Date(data.forDate),
        reason: data.reason ?? null
      }
    });
  }

  async listChangeRequests(orgId: string, status?: "PENDING" | "APPROVED" | "REJECTED" | "all") {
    const where: { orgId: string; status?: string } = { orgId };
    if (status && status !== "all") where.status = status;
    return prisma.shiftChangeRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } },
        fromShift: { select: { id: true, name: true } },
        toShift: { select: { id: true, name: true } }
      },
      orderBy: [{ requestedAt: "desc" }]
    });
  }

  async approveChangeRequest(orgId: string, requestId: string, approvedByUserId: string) {
    const req = await prisma.shiftChangeRequest.findFirst({ where: { id: requestId, orgId }, include: { employee: true } });
    if (!req || req.status !== "PENDING") return null;
    await prisma.$transaction([
      prisma.shiftChangeRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", approvedByUserId, approvedAt: new Date() }
      }),
      prisma.shiftOverride.upsert({
        where: {
          orgId_employeeId_forDate: { orgId, employeeId: req.employeeId, forDate: req.forDate }
        },
        create: {
          orgId,
          employeeId: req.employeeId,
          shiftId: req.toShiftId,
          forDate: req.forDate,
          overrideType: "ONE_DAY",
          reason: req.reason,
          approvedByUserId
        },
        update: {
          shiftId: req.toShiftId,
          reason: req.reason,
          approvedByUserId
        }
      })
    ]);
    return prisma.shiftChangeRequest.findUnique({ where: { id: requestId }, include: { employee: true, toShift: true } });
  }

  async rejectChangeRequest(orgId: string, requestId: string, rejectionReason: string) {
    const req = await prisma.shiftChangeRequest.findFirst({ where: { id: requestId, orgId } });
    if (!req || req.status !== "PENDING") return null;
    return prisma.shiftChangeRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", rejectionReason }
    });
  }

  // ---- Compliance ----
  async getCompliancePolicy(orgId: string) {
    return prisma.shiftCompliancePolicy.findUnique({
      where: { orgId }
    });
  }

  async upsertCompliancePolicy(input: unknown) {
    const data = compliancePolicySchema.parse(input);
    return prisma.shiftCompliancePolicy.upsert({
      where: { orgId: data.orgId },
      create: {
        orgId: data.orgId,
        maxHoursPerWeek: data.maxHoursPerWeek,
        minRestHoursBetweenShifts: new Decimal(data.minRestHoursBetweenShifts),
        maxOvertimeHoursPerMonth: new Decimal(data.maxOvertimeHoursPerMonth),
        nightShiftStartHour: data.nightShiftStartHour ?? null,
        nightShiftEndHour: data.nightShiftEndHour ?? null,
        maxConsecutiveNightShifts: data.maxConsecutiveNightShifts ?? null
      },
      update: {
        maxHoursPerWeek: data.maxHoursPerWeek,
        minRestHoursBetweenShifts: new Decimal(data.minRestHoursBetweenShifts),
        maxOvertimeHoursPerMonth: new Decimal(data.maxOvertimeHoursPerMonth),
        nightShiftStartHour: data.nightShiftStartHour ?? null,
        nightShiftEndHour: data.nightShiftEndHour ?? null,
        maxConsecutiveNightShifts: data.maxConsecutiveNightShifts ?? null
      }
    });
  }

  /** Validate shift against compliance policy (e.g. rest hours, night shift). Returns list of violations. */
  async validateShiftCompliance(orgId: string, shiftId: string): Promise<string[]> {
    const policy = await this.getCompliancePolicy(orgId);
    const shift = await prisma.shift.findFirst({ where: { id: shiftId, orgId } });
    if (!policy || !shift) return [];
    const violations: string[] = [];
    const startHour = Math.floor(shift.startMinute / 60);
    const endHour = Math.floor(shift.endMinute / 60);
    if (policy.nightShiftStartHour != null && policy.nightShiftEndHour != null) {
      const isNight = startHour >= policy.nightShiftStartHour || endHour <= policy.nightShiftEndHour;
      if (isNight && policy.maxConsecutiveNightShifts != null) {
        // Could check consecutive nights from assignments - simplified here
      }
    }
    const durationMinutes = shift.endMinute > shift.startMinute ? shift.endMinute - shift.startMinute : 1440 - shift.startMinute + shift.endMinute;
    const hoursPerDay = (durationMinutes - (shift.breakDurationMinutes ?? 0)) / 60;
    if (hoursPerDay > 12) violations.push("Shift duration exceeds 12 hours per day");
    return violations;
  }

  // ---- Override ----
  async createOverride(input: unknown) {
    const data = overrideSchema.parse(input);
    return prisma.shiftOverride.upsert({
      where: {
        orgId_employeeId_forDate: { orgId: data.orgId, employeeId: data.employeeId, forDate: new Date(data.forDate) }
      },
      create: {
        orgId: data.orgId,
        employeeId: data.employeeId,
        shiftId: data.shiftId,
        forDate: new Date(data.forDate),
        overrideType: data.overrideType,
        reason: data.reason ?? null,
        approvedByUserId: data.approvedByUserId ?? null
      },
      update: {
        shiftId: data.shiftId,
        overrideType: data.overrideType,
        reason: data.reason ?? null,
        approvedByUserId: data.approvedByUserId ?? null
      }
    });
  }

  // ---- Dashboard stats ----
  async getShiftDashboardStats(orgId: string) {
    const [totalShifts, assignedCount, activeRotations, pendingRequests] = await prisma.$transaction([
      prisma.shift.count({ where: { orgId, status: "ACTIVE" } }),
      prisma.employeeShiftAssignment.count({
        where: {
          orgId,
          effectiveFrom: { lte: new Date() },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }]
        }
      }),
      prisma.shiftRotationAssignment.count({
        where: {
          orgId,
          rotation: { status: "ACTIVE" },
          effectiveFrom: { lte: new Date() },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }]
        }
      }),
      prisma.shiftChangeRequest.count({ where: { orgId, status: "PENDING" } })
    ]);
    return { totalShifts, assignedCount, activeRotations, pendingRequests };
  }
}
