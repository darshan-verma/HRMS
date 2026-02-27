import { Worker } from "bullmq";
import { getRedisClient } from "@/lib/redis";
import { PayslipService } from "@/src/modules/payroll/payslip.service";

const connection = getRedisClient();

const service = new PayslipService();

export const payrollWorker = new Worker(
  "payroll",
  async (job) => {
    if (job.name === "generate-payroll-run") {
      return service.generateRunPayslips({
        orgId: job.data.orgId as string,
        payrollRunId: job.data.payrollRunId as string,
        regime: job.data.regime as "OLD" | "NEW"
      });
    }
    return null;
  },
  { connection }
);
