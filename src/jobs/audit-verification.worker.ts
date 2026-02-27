import { Worker } from "bullmq";
import { getRedisClient } from "@/lib/redis";
import { verifyAuditChain } from "@/lib/audit/verify-audit-chain";

const connection = getRedisClient();

export const auditVerificationWorker = new Worker(
  "audit",
  async (job) => {
    const orgId = job.data.orgId as string;
    return verifyAuditChain(orgId);
  },
  { connection }
);
