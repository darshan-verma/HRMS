import { prisma } from "@/lib/prisma";
import { ShiftService } from "@/src/modules/shift/shift.service";
import { z } from "zod";

const attendanceSchema = z.object({
  orgId: z.string().min(1),
  employeeId: z.string().min(1),
  attendanceDate: z.string().datetime(),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE"])
});

export class AttendanceService {
  private readonly shiftService = new ShiftService();

  async mark(input: unknown) {
    const data = attendanceSchema.parse(input);
    return prisma.attendance.upsert({
      where: {
        orgId_employeeId_attendanceDate: {
          orgId: data.orgId,
          employeeId: data.employeeId,
          attendanceDate: new Date(data.attendanceDate)
        }
      },
      update: { status: data.status },
      create: {
        orgId: data.orgId,
        employeeId: data.employeeId,
        attendanceDate: new Date(data.attendanceDate),
        status: data.status
      }
    });
  }

  async checkIn(input: { orgId: string; employeeId: string; at: string }) {
    const at = new Date(input.at);
    const shift = await this.shiftService.resolveEmployeeShift(input.orgId, input.employeeId, at);
    const attendanceDate = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));

    return prisma.attendance.upsert({
      where: {
        orgId_employeeId_attendanceDate: {
          orgId: input.orgId,
          employeeId: input.employeeId,
          attendanceDate
        }
      },
      update: {
        checkInAt: at,
        status: "PRESENT",
        shiftId: shift?.id
      },
      create: {
        orgId: input.orgId,
        employeeId: input.employeeId,
        attendanceDate,
        checkInAt: at,
        status: "PRESENT",
        shiftId: shift?.id
      }
    });
  }

  async checkOut(input: { orgId: string; employeeId: string; at: string }) {
    const at = new Date(input.at);
    const attendanceDate = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
    return prisma.attendance.updateMany({
      where: {
        orgId: input.orgId,
        employeeId: input.employeeId,
        attendanceDate
      },
      data: {
        checkOutAt: at
      }
    });
  }

  async list(orgId: string, from: Date, to: Date, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await prisma.$transaction([
      prisma.attendance.findMany({
        where: {
          orgId,
          attendanceDate: { gte: from, lte: to }
        },
        include: {
          employee: { select: { fullName: true, employeeCode: true } },
          shift: true
        },
        orderBy: [{ attendanceDate: "desc" }],
        skip,
        take: pageSize
      }),
      prisma.attendance.count({
        where: {
          orgId,
          attendanceDate: { gte: from, lte: to }
        }
      })
    ]);

    return { items, total, page, pageSize };
  }
}
