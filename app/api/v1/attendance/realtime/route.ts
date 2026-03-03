import { PERMISSIONS } from "@/lib/auth/rbac";
import { AttendanceService } from "@/src/modules/attendance/attendance.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  date: z
    .string()
    .optional()
    .transform((s) => (s ? new Date(s) : new Date()))
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.ATTENDANCE_READ);
  if (forbidden) return forbidden;

  const date = query.date;
  const service = new AttendanceService();
  const view = await service.getRealtimeView(query.orgId, date);
  return NextResponse.json(view);
}
