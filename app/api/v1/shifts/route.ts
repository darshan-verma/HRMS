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
  name: z.string().min(2),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(0).max(1439),
  graceMinutes: z.number().int().min(0).max(180).default(0)
});

const listSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1)
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = createSchema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.SHIFT_WRITE);
  if (forbidden) return forbidden;

  const service = new ShiftService();
  const shift = await service.createShift(input);
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "SHIFT_CREATE",
    resourceType: "SHIFT",
    resourceId: shift.id
  });

  return NextResponse.json(shift, { status: 201 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = listSchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.SHIFT_READ);
  if (forbidden) return forbidden;

  const service = new ShiftService();
  return NextResponse.json(await service.listShifts(query.orgId));
}
