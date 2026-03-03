import { PERMISSIONS } from "@/lib/auth/rbac";
import { LeaveService } from "@/src/modules/leave/leave.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1)
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.LEAVE_READ);
  if (forbidden) return forbidden;

  const service = new LeaveService();
  const stats = await service.getStats(query.orgId);
  return NextResponse.json(stats);
}
