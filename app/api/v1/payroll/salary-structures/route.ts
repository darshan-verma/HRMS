import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { SalaryStructureService } from "@/src/modules/payroll/salary-structure.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  employeeId: z.string().min(1),
  basic: z.string().min(1),
  hra: z.string().min(1),
  specialAllowance: z.string().min(1),
  otherAllowance: z.string().optional(),
  epfApplicable: z.boolean().default(true),
  esiApplicable: z.boolean().default(false),
  professionalTax: z.string().optional(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional()
});

const listSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  employeeId: z.string().optional()
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = createSchema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.PAYROLL_WRITE);
  if (forbidden) return forbidden;

  const service = new SalaryStructureService();
  const structure = await service.create(input);
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "SALARY_STRUCTURE_CREATE",
    resourceType: "SALARY_STRUCTURE",
    resourceId: structure.id
  });
  return NextResponse.json(structure, { status: 201 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = listSchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.PAYROLL_READ);
  if (forbidden) return forbidden;

  const service = new SalaryStructureService();
  return NextResponse.json(await service.list(query.orgId, query.employeeId));
}
