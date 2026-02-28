import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { PayslipService } from "@/src/modules/payroll/payslip.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  payrollRunId: z.string().min(1)
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.PAYROLL_READ);
  if (forbidden) return forbidden;

  const service = new PayslipService();
  const csv = await service.bankExportCsv(query.orgId, query.payrollRunId);
  await createAuditLog({
    orgId: query.orgId,
    actorUserId: query.actorUserId,
    action: "PAYROLL_BANK_EXPORT",
    resourceType: "PAYROLL_RUN",
    resourceId: query.payrollRunId
  });
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="bank-export-${query.payrollRunId}.csv"`
    }
  });
}
