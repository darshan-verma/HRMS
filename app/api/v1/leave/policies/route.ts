import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { LeavePolicyService } from "@/src/modules/leave/leave-policy.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  leaveType: z.string().min(2),
  annualQuota: z.number().int().min(0),
  carryForward: z.boolean().default(false),
  accrualPerMonth: z.string().min(1)
});

const listSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1)
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = createSchema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.LEAVE_WRITE);
  if (forbidden) return forbidden;

  const service = new LeavePolicyService();
  const policy = await service.createPolicy(input);
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "LEAVE_POLICY_CREATE",
    resourceType: "LEAVE_POLICY",
    resourceId: policy.id
  });

  return NextResponse.json(policy, { status: 201 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = listSchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.LEAVE_READ);
  if (forbidden) return forbidden;

  const service = new LeavePolicyService();
  return NextResponse.json(await service.listPolicies(query.orgId));
}
