import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { PayslipService } from "@/src/modules/payroll/payslip.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().min(1),
  payrollRunId: z.string().min(1)
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: payrollRunId } = await params;
  const body = schema.parse({ ...(await req.json()), payrollRunId });
  const forbidden = authorize(body.actorRole, PERMISSIONS.PAYROLL_WRITE);
  if (forbidden) return forbidden;

  const service = new PayslipService();
  const run = await service.reopenRun({
    orgId: body.orgId,
    payrollRunId,
    reopenedByUserId: body.actorUserId
  });
  await createAuditLog({
    orgId: body.orgId,
    actorUserId: body.actorUserId,
    action: "PAYROLL_RUN_REOPEN",
    resourceType: "PAYROLL_RUN",
    resourceId: payrollRunId
  });
  return NextResponse.json(run);
}
