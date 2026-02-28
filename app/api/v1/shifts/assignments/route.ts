import { PERMISSIONS } from "@/lib/auth/rbac";
import { ShiftService } from "@/src/modules/shift/shift.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  employeeId: z.string().min(1).optional(),
  shiftId: z.string().min(1).optional(),
  effectiveOn: z.string().datetime().optional()
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.SHIFT_READ);
  if (forbidden) return forbidden;

  const service = new ShiftService();
  const filters =
    query.employeeId || query.shiftId || query.effectiveOn
      ? {
          employeeId: query.employeeId,
          shiftId: query.shiftId,
          effectiveOn: query.effectiveOn ? new Date(query.effectiveOn) : undefined
        }
      : undefined;
  const list = await service.listAssignments(query.orgId, filters);
  return NextResponse.json(list);
}
