import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { ShiftService } from "@/src/modules/shift/shift.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  employeeId: z.string().min(1),
  rotationId: z.string().min(1),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional()
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = schema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.SHIFT_WRITE);
  if (forbidden) return forbidden;

  const service = new ShiftService();
  const assignment = await service.assignRotation(input);
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "SHIFT_ROTATION_ASSIGN",
    resourceType: "SHIFT_ROTATION_ASSIGNMENT",
    resourceId: assignment.id
  });
  return NextResponse.json(assignment, { status: 201 });
}
