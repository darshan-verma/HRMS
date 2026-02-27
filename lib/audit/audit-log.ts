import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import crypto from "node:crypto";

type AuditInput = {
  orgId: string;
  actorUserId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Prisma.InputJsonValue;
};

export async function createAuditLog(input: AuditInput): Promise<void> {
  const previous = await prisma.auditLog.findFirst({
    where: { orgId: input.orgId },
    orderBy: { createdAt: "desc" },
    select: { hash: true }
  });

  const previousHash = previous?.hash ?? "GENESIS";
  const payload = JSON.stringify({
    previousHash,
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: input.metadata ?? null
  });
  const hash = crypto.createHash("sha256").update(payload).digest("hex");

  await prisma.auditLog.create({
    data: {
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: input.metadata,
      hash
    }
  });
}
