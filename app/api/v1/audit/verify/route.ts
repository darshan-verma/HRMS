import { createAuditLog } from "@/lib/audit/audit-log";
import { verifyAuditChain } from "@/lib/audit/verify-audit-chain";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional()
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = schema.parse(await req.json());
  const forbidden = authorize(input.actorRole, PERMISSIONS.AUDIT_READ);
  if (forbidden) return forbidden;

  const result = await verifyAuditChain(input.orgId);

  await createAuditLog({
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "AUDIT_CHAIN_VERIFY",
    resourceType: "AUDIT_LOG",
    metadata: result
  });

  return NextResponse.json(result);
}
