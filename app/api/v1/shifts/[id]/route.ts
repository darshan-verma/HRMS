import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { ShiftService } from "@/src/modules/shift/shift.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1)
});

const updateSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  shiftId: z.string().min(1),
  name: z.string().min(2).optional(),
  code: z.string().optional(),
  startMinute: z.number().int().min(0).max(1439).optional(),
  endMinute: z.number().int().min(0).max(1439).optional(),
  graceMinutes: z.number().int().min(0).max(180).optional(),
  breakDurationMinutes: z.number().int().min(0).max(480).optional(),
  breakPaid: z.boolean().optional(),
  weeklyOffPattern: z.array(z.number().int().min(0).max(6)).optional(),
  earlyLeaveToleranceMinutes: z.number().int().min(0).max(120).optional(),
  halfDayThresholdMinutes: z.number().int().min(0).max(720).optional(),
  overtimeEligible: z.boolean().optional(),
  overtimeMultiplier: z.number().min(1).max(3).optional().nullable(),
  minWorkingHoursMinutes: z.number().int().min(0).max(720).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional()
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const query = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.SHIFT_READ);
  if (forbidden) return forbidden;

  const service = new ShiftService();
  const shift = await service.getShift(query.orgId, id);
  if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  return NextResponse.json(shift);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json();
  const input = updateSchema.parse({ ...body, shiftId: id });
  const forbidden = authorize(input.actorRole, PERMISSIONS.SHIFT_WRITE);
  if (forbidden) return forbidden;

  const service = new ShiftService();
  const shift = await service.updateShift(input);
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "SHIFT_UPDATE",
    resourceType: "SHIFT",
    resourceId: shift.id
  });
  return NextResponse.json(shift);
}
