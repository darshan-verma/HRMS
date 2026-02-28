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
  rotationType: z.enum(["WEEKLY", "MONTHLY"]),
  shiftOrder: z.array(z.string().min(1)),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE")
});

const listSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE", "all"]).optional()
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = createSchema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.SHIFT_WRITE);
  if (forbidden) return forbidden;

  const service = new ShiftService();
  const rotation = await service.createRotation(input);
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "SHIFT_ROTATION_CREATE",
    resourceType: "SHIFT_ROTATION",
    resourceId: rotation.id
  });
  return NextResponse.json(rotation, { status: 201 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = listSchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.SHIFT_READ);
  if (forbidden) return forbidden;

  const service = new ShiftService();
  return NextResponse.json(await service.listRotations(query.orgId, query.status));
}
