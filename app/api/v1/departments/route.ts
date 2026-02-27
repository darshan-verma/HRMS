import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { DepartmentService } from "@/src/modules/department/department.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  name: z.string().min(2),
  parentId: z.string().optional()
});

const listSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1)
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = createSchema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.EMPLOYEE_WRITE);
  if (forbidden) return forbidden;

  const service = new DepartmentService();
  const department = await service.create(input);
  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "DEPARTMENT_CREATE",
    resourceType: "DEPARTMENT",
    resourceId: department.id
  });

  return NextResponse.json(department, { status: 201 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = listSchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.EMPLOYEE_READ);
  if (forbidden) return forbidden;

  const service = new DepartmentService();
  return NextResponse.json(await service.listByOrg(query.orgId));
}
