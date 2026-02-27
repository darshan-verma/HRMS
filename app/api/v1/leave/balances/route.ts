import { PERMISSIONS } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  employeeId: z.string().optional()
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.LEAVE_READ);
  if (forbidden) return forbidden;

  const balances = await prisma.leaveBalance.findMany({
    where: {
      orgId: query.orgId,
      ...(query.employeeId ? { employeeId: query.employeeId } : {})
    },
    include: {
      employee: { select: { fullName: true, employeeCode: true } },
      leavePolicy: { select: { leaveType: true } }
    },
    orderBy: [{ updatedAt: "desc" }]
  });
  return NextResponse.json(balances);
}
