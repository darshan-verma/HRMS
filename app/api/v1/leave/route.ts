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
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().max(500).optional(),
  documentKey: z.string().optional()
});

const listSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  status: z.string().optional(),
  employeeId: z.string().optional()
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = schema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.LEAVE_WRITE);
  if (forbidden) return forbidden;

  const service = new LeaveService();
  try {
    const leave = await service.requestLeave(input);
    await createAuditLog({
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      action: "LEAVE_REQUEST_CREATE",
      resourceType: "LEAVE_REQUEST",
      resourceId: leave.id
    });
    return NextResponse.json(leave, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    if (
      message === "Insufficient leave balance" ||
      message === "Overlapping leave already exists for this period" ||
      message === "Leave policy not found" ||
      message === "End date must be on or after start date"
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    throw err;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = listSchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.LEAVE_READ);
  if (forbidden) return forbidden;

  const service = new LeaveService();
  return NextResponse.json(
    await service.listRequests(query.orgId, query.status, query.employeeId)
  );
}
