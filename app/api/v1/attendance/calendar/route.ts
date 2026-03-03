import { PERMISSIONS } from "@/lib/auth/rbac";
import { AttendanceService } from "@/src/modules/attendance/attendance.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  from: z.string().transform((s) => new Date(s)),
  to: z.string().transform((s) => new Date(s))
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.ATTENDANCE_READ);
  if (forbidden) return forbidden;

  const service = new AttendanceService();
  const data = await service.getCalendar(
    query.orgId,
    new Date(query.from),
    new Date(query.to)
  );
  return NextResponse.json(data);
}
