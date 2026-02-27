import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { PayslipService } from "@/src/modules/payroll/payslip.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  period: z.string().min(7)
});

const listSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1)
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = createSchema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.PAYROLL_WRITE);
  if (forbidden) return forbidden;

  const service = new PayslipService();
  const run = await service.createPayrollRun(input);
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "PAYROLL_RUN_CREATE",
    resourceType: "PAYROLL_RUN",
    resourceId: run.id
  });
  return NextResponse.json(run, { status: 201 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = listSchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.PAYROLL_READ);
  if (forbidden) return forbidden;

  const runs = await prisma.payrollRun.findMany({
    where: { orgId: query.orgId },
    orderBy: [{ startedAt: "desc" }]
  });
  return NextResponse.json(runs);
}
