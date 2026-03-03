import { prisma } from "@/lib/prisma";
import { ShiftService } from "@/src/modules/shift/shift.service";
import { z } from "zod";
import type { Shift, Attendance } from "@prisma/client";

const attendanceSchema = z.object({
  orgId: z.string().min(1),
  employeeId: z.string().min(1),
  attendanceDate: z.string().datetime(),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE"])
});

type AttendanceWithRelations = Attendance & {
  employee: { fullName: string; employeeCode: string };
  shift: Shift | null;
};

/** Minutes from midnight (0–1439) for a given date's local time. */
function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Working minutes between check-in and check-out, minus break. Handles same-day and cross-day. */
function workingMinutes(
  checkInAt: Date,
  checkOutAt: Date,
  breakDurationMinutes: number = 0
): number {
  const diffMs = checkOutAt.getTime() - checkInAt.getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));
  return Math.max(0, totalMinutes - breakDurationMinutes);
}

/** Standard working minutes for shift (same-day). For night shift, caller can pass adjusted end. */
function standardMinutes(shift: Shift): number {
  const breakMin = shift.breakDurationMinutes ?? 0;
  if (shift.endMinute > shift.startMinute) {
    return shift.endMinute - shift.startMinute - breakMin;
  }
  // Cross-day: e.g. 22:00 to 06:00 = 8h
  const span = 24 * 60 - shift.startMinute + shift.endMinute - breakMin;
  return Math.min(span, 12 * 60); // cap 12h
}

/** Derive display status: PRESENT, LATE, HALF_DAY, ON_LEAVE, ABSENT, HOLIDAY, WEEKEND. */
function deriveStatus(
  record: AttendanceWithRelations,
  workingMinutesVal: number,
  isLate: boolean
): string {
  if (record.status === "ON_LEAVE") return "ON_LEAVE";
  if (record.status === "ABSENT") return "ABSENT";
  if (record.status === "HALF_DAY") return "HALF_DAY";
  if (record.status === "PRESENT") {
    if (isLate) return "LATE";
    if (record.shift && workingMinutesVal < (record.shift.halfDayThresholdMinutes ?? 240))
      return "HALF_DAY";
    return "PRESENT";
  }
  return record.status;
}

/** Enrich list items with working hours, overtime, and derived status. */
function enrichItems(
  items: AttendanceWithRelations[]
): (AttendanceWithRelations & {
  workingHoursMinutes: number;
  overtimeMinutes: number;
  derivedStatus: string;
  isLate: boolean;
})[] {
  return items.map((row) => {
    const shift = row.shift;
    const breakMin = shift?.breakDurationMinutes ?? 0;
    let workingMinutesVal = 0;
    let overtimeMinutesVal = 0;
    let isLate = false;

    if (row.checkInAt && row.checkOutAt) {
      workingMinutesVal = workingMinutes(row.checkInAt, row.checkOutAt, breakMin);
      const checkInMinutes = minutesOfDay(row.checkInAt);
      const grace = shift?.graceMinutes ?? 0;
      const startMin = shift?.startMinute ?? 540;
      isLate = checkInMinutes > startMin + grace;

      if (shift?.overtimeEligible && workingMinutesVal > 0) {
        const standard = shift.minWorkingHoursMinutes ?? standardMinutes(shift);
        overtimeMinutesVal = Math.max(0, workingMinutesVal - standard);
      }
    } else if (row.checkInAt) {
      // No checkout: could be still working or missing punch
      const checkInMinutes = minutesOfDay(row.checkInAt);
      const grace = shift?.graceMinutes ?? 0;
      const startMin = shift?.startMinute ?? 540;
      isLate = checkInMinutes > startMin + grace;
    }

    const derivedStatus = deriveStatus(row, workingMinutesVal, isLate);

    return {
      ...row,
      workingHoursMinutes: workingMinutesVal,
      overtimeMinutes: overtimeMinutesVal,
      derivedStatus,
      isLate
    };
  });
}

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
    const updated = await prisma.attendance.updateMany({
      where: {
        orgId: input.orgId,
        employeeId: input.employeeId,
        attendanceDate
      },
      data: {
        checkOutAt: at
      }
    });
    const record = await prisma.attendance.findFirst({
      where: {
        orgId: input.orgId,
        employeeId: input.employeeId,
        attendanceDate
      }
    });
    return record ?? updated;
  }

  async list(orgId: string, from: Date, to: Date, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [rawItems, total] = await prisma.$transaction([
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

    const items = enrichItems(rawItems as AttendanceWithRelations[]);
    return { items, total, page, pageSize };
  }

  /** Dashboard stats for a given date: present, absent, late, on leave, WFH, overtime hours. */
  async getDashboardStats(orgId: string, date: Date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [
      todayAttendance,
      onLeaveCount,
      totalEmployees
    ] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          orgId,
          attendanceDate: { gte: dayStart, lte: dayEnd }
        },
        include: {
          employee: { select: { id: true, fullName: true, employeeCode: true } },
          shift: true
        }
      }),
      prisma.leaveRequest.count({
        where: {
          orgId,
          status: "APPROVED",
          startDate: { lte: dayEnd },
          endDate: { gte: dayStart }
        }
      }),
      prisma.employee.count({ where: { orgId, isDeleted: false } })
    ]);

    const enriched = enrichItems(todayAttendance as AttendanceWithRelations[]);
    const presentCount = enriched.filter((r) => r.status === "PRESENT" || r.derivedStatus === "LATE" || r.derivedStatus === "HALF_DAY").length;
    const lateCount = enriched.filter((r) => r.isLate).length;
    const overtimeTotalMinutes = enriched.reduce((sum, r) => sum + r.overtimeMinutes, 0);
    const overtimeHoursToday = Math.round((overtimeTotalMinutes / 60) * 100) / 100;

    const presentEmployeeIds = new Set(enriched.filter((r) => r.status === "PRESENT" || r.derivedStatus === "LATE" || r.derivedStatus === "HALF_DAY").map((r) => r.employeeId));
    const onLeaveEmployeeIds = await prisma.leaveRequest
      .findMany({
        where: {
          orgId,
          status: "APPROVED",
          startDate: { lte: dayEnd },
          endDate: { gte: dayStart }
        },
        select: { employeeId: true }
      })
      .then((rows) => new Set(rows.map((r) => r.employeeId)));

    const expectedToday = totalEmployees - onLeaveCount;
    const absentCount = Math.max(0, expectedToday - presentCount);

    return {
      employeesPresentToday: presentCount,
      employeesAbsent: absentCount,
      lateCheckIns: lateCount,
      onLeave: onLeaveCount,
      workFromHome: 0,
      overtimeHoursToday,
      totalEmployees,
      expectedToday
    };
  }

  /** Real-time view: currently working (present, no checkout or checkout after now), checked out, on leave, absent. */
  async getRealtimeView(orgId: string, date: Date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    const now = new Date();

    const [attendance, onLeaveEmployees] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          orgId,
          attendanceDate: { gte: dayStart, lte: dayEnd },
          status: "PRESENT"
        },
        include: {
          employee: { select: { id: true, fullName: true, employeeCode: true } },
          shift: true
        }
      }),
      prisma.leaveRequest.findMany({
        where: {
          orgId,
          status: "APPROVED",
          startDate: { lte: dayEnd },
          endDate: { gte: dayStart }
        },
        include: { employee: { select: { id: true, fullName: true, employeeCode: true } } }
      })
    ]);

    const currentlyWorking: typeof attendance = [];
    const checkedOut: typeof attendance = [];

    for (const a of attendance) {
      if (!a.checkOutAt || a.checkOutAt > now) {
        currentlyWorking.push(a);
      } else {
        checkedOut.push(a);
      }
    }

    return {
      currentlyWorking: currentlyWorking.map((a) => ({
        id: a.id,
        employeeId: a.employeeId,
        fullName: (a as { employee: { fullName: string } }).employee.fullName,
        employeeCode: (a as { employee: { employeeCode: string } }).employee.employeeCode,
        checkInAt: a.checkInAt
      })),
      checkedOut: checkedOut.map((a) => ({
        id: a.id,
        employeeId: a.employeeId,
        fullName: (a as { employee: { fullName: string } }).employee.fullName,
        employeeCode: (a as { employee: { employeeCode: string } }).employee.employeeCode,
        checkInAt: a.checkInAt,
        checkOutAt: a.checkOutAt
      })),
      onLeave: onLeaveEmployees.map((r) => ({
        employeeId: r.employeeId,
        fullName: r.employee.fullName,
        employeeCode: r.employee.employeeCode
      })),
      absentCount: 0
    };
  }

  /** Calendar view: attendance + leave for a month. */
  async getCalendar(orgId: string, from: Date, to: Date) {
    const [attendance, leaveRequests] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          orgId,
          attendanceDate: { gte: from, lte: to }
        },
        include: {
          employee: { select: { id: true, fullName: true, employeeCode: true } },
          shift: true
        }
      }),
      prisma.leaveRequest.findMany({
        where: {
          orgId,
          status: "APPROVED",
          startDate: { lte: to },
          endDate: { gte: from }
        },
        include: {
          employee: { select: { id: true, fullName: true, employeeCode: true } },
          leavePolicy: { select: { leaveType: true } }
        }
      })
    ]);

    const enriched = enrichItems(attendance as AttendanceWithRelations[]);

    return {
      attendance: enriched.map((a) => ({
        id: a.id,
        employeeId: a.employeeId,
        employeeName: a.employee.fullName,
        employeeCode: a.employee.employeeCode,
        date: a.attendanceDate,
        status: a.status,
        derivedStatus: a.derivedStatus,
        checkInAt: a.checkInAt,
        checkOutAt: a.checkOutAt,
        workingHoursMinutes: a.workingHoursMinutes,
        overtimeMinutes: a.overtimeMinutes
      })),
      leave: leaveRequests.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: r.employee.fullName,
        employeeCode: r.employee.employeeCode,
        leaveType: r.leavePolicy.leaveType,
        startDate: r.startDate,
        endDate: r.endDate
      }))
    };
  }
}
