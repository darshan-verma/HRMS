import { Queue } from "bullmq";
import { getRedisClient } from "@/lib/redis";

const connection = getRedisClient();

export const payrollQueue = new Queue("payroll", { connection });
export const reportsQueue = new Queue("reports", { connection });
export const auditQueue = new Queue("audit", { connection });
