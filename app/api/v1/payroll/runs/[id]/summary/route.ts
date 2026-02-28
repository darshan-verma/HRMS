import { PERMISSIONS } from "@/lib/auth/rbac";
import { PayslipService } from "@/src/modules/payroll/payslip.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1)
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: payrollRunId } = await params;
  const query = schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.PAYROLL_READ);
  if (forbidden) return forbidden;

  const service = new PayslipService();
  const summary = await service.getRunSummary(payrollRunId, query.orgId);
  if (!summary) return NextResponse.json({ message: "Payroll run not found" }, { status: 404 });
  return NextResponse.json(summary);
}
