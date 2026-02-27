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
  at: z.string().datetime()
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = schema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.ATTENDANCE_WRITE);
  if (forbidden) return forbidden;

  const service = new AttendanceService();
  const record = await service.checkIn(input);
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "ATTENDANCE_CHECK_IN",
    resourceType: "ATTENDANCE",
    resourceId: record.id
  });
  return NextResponse.json(record);
}
