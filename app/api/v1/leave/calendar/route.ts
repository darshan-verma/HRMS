import { PERMISSIONS } from "@/lib/auth/rbac";
import { LeaveService } from "@/src/modules/leave/leave.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  departmentId: z.string().optional()
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.LEAVE_READ);
  if (forbidden) return forbidden;

  const from = new Date(query.from);
  const to = new Date(query.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid from or to date" }, { status: 400 });
  }

  const service = new LeaveService();
  const events = await service.getCalendar(query.orgId, from, to, query.departmentId);
  return NextResponse.json(events);
}
