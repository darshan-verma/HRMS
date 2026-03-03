import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { LeaveService } from "@/src/modules/leave/leave.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  leaveRequestId: z.string().min(1)
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = schema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.LEAVE_WRITE);
  if (forbidden) return forbidden;

  const service = new LeaveService();
  const leave = await service.withdraw(input.orgId, input.leaveRequestId);
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "LEAVE_WITHDRAW",
    resourceType: "LEAVE_REQUEST",
    resourceId: input.leaveRequestId
  });
  return NextResponse.json(leave);
}
