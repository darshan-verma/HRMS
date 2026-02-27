import { PERMISSIONS } from "@/lib/auth/rbac";
import { IndiaTaxService } from "@/src/modules/payroll/tax-india.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  actorRole: z.string().min(1),
  annualTaxableIncome: z.string().min(1),
  regime: z.enum(["OLD", "NEW"])
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = schema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.PAYROLL_READ);
  if (forbidden) return forbidden;
  const service = new IndiaTaxService();
  return NextResponse.json(
    service.calculateAnnualTax({
      annualTaxableIncome: input.annualTaxableIncome,
      regime: input.regime
    })
  );
}
