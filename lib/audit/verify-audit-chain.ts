import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";

export async function verifyAuditChain(orgId: string): Promise<{
  valid: boolean;
  checked: number;
  brokenAtLogId?: string;
}> {
  const logs = await prisma.auditLog.findMany({
    where: { orgId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }]
  });

  let previousHash = "GENESIS";
  for (const log of logs) {
    const payload = JSON.stringify({
      previousHash,
      orgId: log.orgId,
      actorUserId: log.actorUserId ?? undefined,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId ?? undefined,
      ipAddress: log.ipAddress ?? undefined,
      userAgent: log.userAgent ?? undefined,
      metadata: log.metadata ?? null
    });
    const expected = crypto.createHash("sha256").update(payload).digest("hex");
    if (expected !== log.hash) {
      return {
        valid: false,
        checked: logs.length,
        brokenAtLogId: log.id
      };
    }
    previousHash = log.hash ?? "";
  }

  return { valid: true, checked: logs.length };
}
