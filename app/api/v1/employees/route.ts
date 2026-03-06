import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS, hasPermission } from "@/lib/auth/rbac";
import { EmployeeService } from "@/src/modules/employee/employee.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  departmentId: z.string().optional(),
  employeeCode: z.string().min(2),
  fullName: z.string().min(2),
  designation: z.string().min(2),
  salaryPlain: z.string().optional()
});

const listSchema = z.object({
  orgId: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
  actorRole: z.string().min(1)
});

const updateSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  employeeId: z.string().min(1),
  fullName: z.string().min(2).optional(),
  designation: z.string().min(2).optional(),
  departmentId: z.string().min(1).nullable().optional(),
  salaryPlain: z.string().optional()
});

const deleteSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  employeeId: z.string().min(1)
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = createSchema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.EMPLOYEE_WRITE);
  if (forbidden) return forbidden;

  // Only roles with PAYROLL_WRITE may set salary on create
  if (!hasPermission(input.actorRole, PERMISSIONS.PAYROLL_WRITE)) {
    delete (input as { salaryPlain?: string }).salaryPlain;
  }

  const service = new EmployeeService();
  const employee = await service.create(input);

  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "EMPLOYEE_CREATE",
    resourceType: "EMPLOYEE",
    resourceId: employee.id
  });

  return NextResponse.json(employee, { status: 201 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const query = listSchema.parse(params);
  const forbidden = authorize(query.actorRole, PERMISSIONS.EMPLOYEE_READ);
  if (forbidden) return forbidden;

  const service = new EmployeeService();
  const result = await service.list(query.orgId, query.page, query.pageSize);
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const input = updateSchema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.EMPLOYEE_WRITE);
  if (forbidden) return forbidden;

  // Only roles with PAYROLL_WRITE may set or change salary
  if (!hasPermission(input.actorRole, PERMISSIONS.PAYROLL_WRITE)) {
    delete (input as { salaryPlain?: string }).salaryPlain;
  }

  const service = new EmployeeService();
  const employee = await service.update(input);
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "EMPLOYEE_UPDATE",
    resourceType: "EMPLOYEE",
    resourceId: input.employeeId
  });

  return NextResponse.json(employee);
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const input = deleteSchema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.EMPLOYEE_WRITE);
  if (forbidden) return forbidden;

  const service = new EmployeeService();
  await service.softDelete(input.orgId, input.employeeId);
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "EMPLOYEE_DELETE",
    resourceType: "EMPLOYEE",
    resourceId: input.employeeId
  });

  return NextResponse.json({ ok: true });
}
