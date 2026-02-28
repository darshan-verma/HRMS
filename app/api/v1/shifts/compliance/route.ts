import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { ShiftService } from "@/src/modules/shift/shift.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const getSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1)
});

const upsertSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  maxHoursPerWeek: z.number().int().min(1).max(168).optional(),
  minRestHoursBetweenShifts: z.number().min(0).max(24).optional(),
  maxOvertimeHoursPerMonth: z.number().min(0).max(200).optional(),
  nightShiftStartHour: z.number().int().min(0).max(23).optional().nullable(),
  nightShiftEndHour: z.number().int().min(0).max(23).optional().nullable(),
  maxConsecutiveNightShifts: z.number().int().min(1).max(30).optional().nullable()
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = getSchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.SHIFT_READ);
  if (forbidden) return forbidden;

  const service = new ShiftService();
  const policy = await service.getCompliancePolicy(query.orgId);
  return NextResponse.json(policy ?? {});
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const input = upsertSchema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.SHIFT_WRITE);
  if (forbidden) return forbidden;

  const service = new ShiftService();
  const policy = await service.upsertCompliancePolicy(input);
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "SHIFT_COMPLIANCE_UPDATE",
    resourceType: "SHIFT_COMPLIANCE_POLICY",
    resourceId: policy.id
  });
  return NextResponse.json(policy);
}
