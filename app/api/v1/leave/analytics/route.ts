import { PERMISSIONS } from "@/lib/auth/rbac";
import { LeaveService } from "@/src/modules/leave/leave.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  from: z.string().optional(),
  to: z.string().optional(),
  departmentId: z.string().optional()
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.LEAVE_READ);
  if (forbidden) return forbidden;

  const from = query.from ? new Date(query.from) : undefined;
  const to = query.to ? new Date(query.to) : undefined;
  if (from && Number.isNaN(from.getTime())) {
    return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
  }
  if (to && Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
  }

  const service = new LeaveService();
  const analytics = await service.getAnalytics(
    query.orgId,
    from ?? undefined,
    to ?? undefined,
    query.departmentId
  );
  return NextResponse.json(analytics);
}
