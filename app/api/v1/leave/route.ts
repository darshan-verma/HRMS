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
  employeeId: z.string().min(1),
  leavePolicyId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().max(500).optional()
});

const listSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  status: z.string().optional()
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = schema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.LEAVE_WRITE);
  if (forbidden) return forbidden;

  const service = new LeaveService();
  const leave = await service.requestLeave(input);
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "LEAVE_REQUEST_CREATE",
    resourceType: "LEAVE_REQUEST",
    resourceId: leave.id
  });

  return NextResponse.json(leave, { status: 201 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = listSchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.LEAVE_READ);
  if (forbidden) return forbidden;

  const service = new LeaveService();
  return NextResponse.json(await service.listRequests(query.orgId, query.status));
}
