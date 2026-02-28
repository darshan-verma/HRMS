import { PERMISSIONS } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const listSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  payrollRunId: z.string().min(1).optional()
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = listSchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.PAYROLL_READ);
  if (forbidden) return forbidden;

  const payslips = await prisma.payslip.findMany({
    where: {
      orgId: query.orgId,
      ...(query.payrollRunId ? { payrollRunId: query.payrollRunId } : {})
    },
    include: {
      employee: { select: { id: true, employeeCode: true, fullName: true } }
    },
    orderBy: [{ period: "desc" }, { grossAmount: "desc" }]
  });

  return NextResponse.json(payslips);
}
