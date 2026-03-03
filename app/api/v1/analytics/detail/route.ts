import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AnalyticsService } from "@/src/modules/analytics/analytics.service";
import { AttendanceService } from "@/src/modules/attendance/attendance.service";
import { LeaveService } from "@/src/modules/leave/leave.service";
import { PayslipService } from "@/src/modules/payroll/payslip.service";
import { ShiftService } from "@/src/modules/shift/shift.service";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  orgId: z.string().min(1)
});

const analyticsService = new AnalyticsService();
const attendanceService = new AttendanceService();
const leaveService = new LeaveService();
const payslipService = new PayslipService();
const shiftService = new ShiftService();

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const { orgId } = querySchema.parse(params);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const latestRun = await prisma.payrollRun.findFirst({
      where: { orgId },
      orderBy: { startedAt: "desc" }
    });

    const [
      summary,
      headcountByDepartment,
      attendanceToday,
      leaveStats,
      leaveAnalytics,
      payrollSummary,
      shiftStats,
      recruitmentCounts,
      totalEmployees
    ] = await Promise.all([
      analyticsService.getOrgMetrics(orgId),
      analyticsService.getHeadcountByDepartment(orgId),
      attendanceService.getDashboardStats(orgId, new Date()),
      leaveService.getStats(orgId),
      leaveService.getAnalytics(orgId),
      latestRun ? payslipService.getRunSummary(latestRun.id, orgId) : Promise.resolve(null),
      shiftService.getShiftDashboardStats(orgId),
      prisma.$transaction([
        prisma.jobPosting.count({ where: { orgId, status: "OPEN" } }),
        prisma.candidate.count({ where: { orgId } }),
        prisma.interview.count({ where: { orgId } })
      ]),
      prisma.employee.count({ where: { orgId, isDeleted: false } })
    ]);

    const [openJobs, totalCandidates, totalInterviews] = recruitmentCounts;

    const data = {
      summary,
      totalEmployees,
      headcountByDepartment,
      attendanceToday,
      leaveStats,
      leaveAnalytics,
      payroll: latestRun
        ? {
            latestRun: {
              id: latestRun.id,
              period: latestRun.period,
              status: latestRun.status,
              startedAt: latestRun.startedAt
            },
            summary: payrollSummary
          }
        : null,
      shiftStats,
      recruitment: {
        openJobs,
        totalCandidates,
        totalInterviews
      }
    };

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to fetch analytics detail." },
      { status: 500 }
    );
  }
}
