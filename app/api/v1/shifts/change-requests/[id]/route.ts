import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { ShiftService } from "@/src/modules/shift/shift.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const actionSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().min(1).optional()
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: requestId } = await params;
  const input = actionSchema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.SHIFT_WRITE);
  if (forbidden) return forbidden;

  const service = new ShiftService();
  if (input.action === "approve") {
    const result = await service.approveChangeRequest(input.orgId, requestId, input.actorUserId);
    if (!result) return NextResponse.json({ error: "Request not found or not pending" }, { status: 404 });
    await createAuditLog({
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      action: "SHIFT_CHANGE_REQUEST_APPROVE",
      resourceType: "SHIFT_CHANGE_REQUEST",
      resourceId: requestId
    });
    return NextResponse.json(result);
  }
  if (input.action === "reject") {
    const result = await service.rejectChangeRequest(input.orgId, requestId, input.rejectionReason ?? "Rejected");
    if (!result) return NextResponse.json({ error: "Request not found or not pending" }, { status: 404 });
    await createAuditLog({
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      action: "SHIFT_CHANGE_REQUEST_REJECT",
      resourceType: "SHIFT_CHANGE_REQUEST",
      resourceId: requestId
    });
    return NextResponse.json(result);
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
