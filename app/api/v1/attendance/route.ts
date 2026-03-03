import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { AttendanceService } from "@/src/modules/attendance/attendance.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  employeeId: z.string().min(1),
  attendanceDate: z.string().datetime(),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE"])
});

const listSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  from: z.string().transform((s) => new Date(s)),
  to: z.string().transform((s) => new Date(s)),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = schema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.ATTENDANCE_WRITE);
  if (forbidden) return forbidden;

  const service = new AttendanceService();
  const record = await service.mark(input);
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "ATTENDANCE_MARK",
    resourceType: "ATTENDANCE",
    resourceId: record.id
  });

  return NextResponse.json(record, { status: 201 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = listSchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.ATTENDANCE_READ);
  if (forbidden) return forbidden;

  const service = new AttendanceService();
  return NextResponse.json(
    await service.list(
      query.orgId,
      query.from,
      query.to,
      query.page,
      query.pageSize
    )
  );
}
