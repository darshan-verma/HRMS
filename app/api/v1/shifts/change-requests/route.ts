import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { ShiftService } from "@/src/modules/shift/shift.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  employeeId: z.string().min(1),
  fromShiftId: z.string().min(1).optional(),
  toShiftId: z.string().min(1),
  forDate: z.string().datetime(),
  reason: z.string().optional()
});

const listSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "all"]).optional()
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = createSchema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.SHIFT_WRITE);
  if (forbidden) return forbidden;

  const service = new ShiftService();
  const request = await service.createChangeRequest(input);
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "SHIFT_CHANGE_REQUEST_CREATE",
    resourceType: "SHIFT_CHANGE_REQUEST",
    resourceId: request.id
  });
  return NextResponse.json(request, { status: 201 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = listSchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.SHIFT_READ);
  if (forbidden) return forbidden;

  const service = new ShiftService();
  return NextResponse.json(await service.listChangeRequests(query.orgId, query.status));
}
