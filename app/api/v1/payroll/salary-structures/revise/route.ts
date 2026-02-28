import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { SalaryStructureService } from "@/src/modules/payroll/salary-structure.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const reviseSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  structureId: z.string().min(1),
  effectiveFrom: z.string().datetime(),
  basic: z.string().min(1),
  hra: z.string().min(1),
  specialAllowance: z.string().min(1),
  otherAllowance: z.string().optional(),
  professionalTax: z.string().optional(),
  epfApplicable: z.boolean(),
  esiApplicable: z.boolean(),
  reasonForRevision: z.string().min(1, "Reason for revision is required")
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = reviseSchema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.PAYROLL_WRITE);
  if (forbidden) return forbidden;

  const service = new SalaryStructureService();
  const result = await service.revise({
    orgId: input.orgId,
    structureId: input.structureId,
    effectiveFrom: input.effectiveFrom,
    basic: input.basic,
    hra: input.hra,
    specialAllowance: input.specialAllowance,
    otherAllowance: input.otherAllowance,
    professionalTax: input.professionalTax,
    epfApplicable: input.epfApplicable,
    esiApplicable: input.esiApplicable,
    reasonForRevision: input.reasonForRevision
  });

  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "SALARY_STRUCTURE_REVISE",
    resourceType: "SALARY_STRUCTURE",
    resourceId: result.new.id,
    metadata: { previousId: input.structureId, reason: input.reasonForRevision }
  });

  return NextResponse.json(result, { status: 201 });
}
