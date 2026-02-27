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
  documentId: z.string().min(1)
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = schema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.EMPLOYEE_READ);
  if (forbidden) return forbidden;

  const service = new EmployeeDocumentService();
  const session = await service.createDownloadSession({
    orgId: input.orgId,
    documentId: input.documentId
  });

  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "DOCUMENT_SIGNED_DOWNLOAD",
    resourceType: "EMPLOYEE_DOCUMENT",
    resourceId: input.documentId
  });

  return NextResponse.json(session);
}
