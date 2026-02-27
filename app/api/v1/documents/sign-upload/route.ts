import { createAuditLog } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { EmployeeDocumentService } from "@/src/modules/employee/employee-document.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  employeeId: z.string().min(1),
  originalFilename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive()
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = schema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.EMPLOYEE_WRITE);
  if (forbidden) return forbidden;

  const service = new EmployeeDocumentService();
  const session = await service.createUploadSession(input);

  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "DOCUMENT_SIGNED_UPLOAD",
    resourceType: "EMPLOYEE_DOCUMENT",
    resourceId: session.documentId
  });

  return NextResponse.json(session, { status: 201 });
}
