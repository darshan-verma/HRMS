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
  shiftId: z.string().min(1),
  newName: z.string().min(2)
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = schema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.SHIFT_WRITE);
  if (forbidden) return forbidden;

  const service = new ShiftService();
  const shift = await service.duplicateShift(input.orgId, input.shiftId, input.newName);
  if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "SHIFT_DUPLICATE",
    resourceType: "SHIFT",
    resourceId: shift.id
  });
  return NextResponse.json(shift, { status: 201 });
}
