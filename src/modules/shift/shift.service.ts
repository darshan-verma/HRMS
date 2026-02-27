import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createShiftSchema = z.object({
  orgId: z.string().min(1),
  name: z.string().min(2),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(0).max(1439),
  graceMinutes: z.number().int().min(0).max(180).default(0)
});

const assignShiftSchema = z.object({
  orgId: z.string().min(1),
  employeeId: z.string().min(1),
  shiftId: z.string().min(1),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional()
});

export class ShiftService {
  async createShift(input: unknown) {
    const data = createShiftSchema.parse(input);
    return prisma.shift.create({
      data: {
        orgId: data.orgId,
        name: data.name,
        startMinute: data.startMinute,
        endMinute: data.endMinute,
        graceMinutes: data.graceMinutes
      }
    });
  }

  async listShifts(orgId: string) {
    return prisma.shift.findMany({
      where: { orgId },
      orderBy: [{ name: "asc" }]
    });
  }

  async assignShift(input: unknown) {
    const data = assignShiftSchema.parse(input);
    return prisma.employeeShiftAssignment.create({
      data: {
        orgId: data.orgId,
        employeeId: data.employeeId,
        shiftId: data.shiftId,
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null
      }
    });
  }

  async resolveEmployeeShift(orgId: string, employeeId: string, onDate: Date) {
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
}
