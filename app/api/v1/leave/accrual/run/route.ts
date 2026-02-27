import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { LeavePolicyService } from "@/src/modules/leave/leave-policy.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional()
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = schema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.LEAVE_WRITE);
  if (forbidden) return forbidden;

  const service = new LeavePolicyService();
  const result = await service.runMonthlyAccrual(input.orgId);
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "LEAVE_ACCRUAL_RUN",
    resourceType: "LEAVE_BALANCE",
    metadata: result
  });

  return NextResponse.json(result);
}
