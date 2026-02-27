import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { payrollQueue } from "@/src/jobs/queue";
import { PayslipService } from "@/src/modules/payroll/payslip.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  payrollRunId: z.string().min(1),
  regime: z.enum(["OLD", "NEW"]),
  runInline: z.boolean().default(false)
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = schema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.PAYROLL_WRITE);
  if (forbidden) return forbidden;

  if (input.runInline) {
    const service = new PayslipService();
    const result = await service.generateRunPayslips({
      orgId: input.orgId,
      payrollRunId: input.payrollRunId,
      regime: input.regime
    });
    await createAuditLog({
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      action: "PAYROLL_RUN_GENERATE_INLINE",
      resourceType: "PAYROLL_RUN",
      resourceId: input.payrollRunId,
      metadata: result
    });
    return NextResponse.json(result);
  }

  const job = await payrollQueue.add("generate-payroll-run", {
    orgId: input.orgId,
    payrollRunId: input.payrollRunId,
    regime: input.regime
  });
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "PAYROLL_RUN_GENERATE_ENQUEUED",
    resourceType: "PAYROLL_RUN",
    resourceId: input.payrollRunId,
    metadata: { jobId: job.id }
  });
  return NextResponse.json({ queued: true, jobId: job.id });
}
