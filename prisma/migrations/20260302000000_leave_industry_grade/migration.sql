-- LeavePolicy: industry-grade policy fields
ALTER TABLE "LeavePolicy" ADD COLUMN "leaveCycle" TEXT NOT NULL DEFAULT 'CALENDAR_YEAR';
ALTER TABLE "LeavePolicy" ADD COLUMN "eligibilityProbationMonths" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LeavePolicy" ADD COLUMN "carryForwardLimit" INTEGER;
ALTER TABLE "LeavePolicy" ADD COLUMN "carryForwardExpiryMonths" INTEGER;
ALTER TABLE "LeavePolicy" ADD COLUMN "sandwichRuleCountWeekends" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LeavePolicy" ADD COLUMN "accrualType" TEXT NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE "LeavePolicy" ADD COLUMN "encashmentRate" DECIMAL(10,2);
ALTER TABLE "LeavePolicy" ADD COLUMN "maxEncashableDays" INTEGER;

-- LeaveRequest: document key and date range index
ALTER TABLE "LeaveRequest" ADD COLUMN "documentKey" TEXT;
CREATE INDEX "LeaveRequest_orgId_startDate_endDate_idx" ON "LeaveRequest"("orgId", "startDate", "endDate");

-- LeaveBalance: used, opening, cycle year
ALTER TABLE "LeaveBalance" ADD COLUMN "usedDays" DECIMAL(8,2) NOT NULL DEFAULT 0;
ALTER TABLE "LeaveBalance" ADD COLUMN "openingBalance" DECIMAL(8,2) NOT NULL DEFAULT 0;
ALTER TABLE "LeaveBalance" ADD COLUMN "cycleYear" INTEGER;

-- LeaveAccrualLog: new table for accrual audit
CREATE TABLE "LeaveAccrualLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leavePolicyId" TEXT NOT NULL,
    "accrualType" TEXT NOT NULL,
    "amount" DECIMAL(8,2) NOT NULL,
    "cycleMonth" INTEGER,
    "cycleYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveAccrualLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeaveAccrualLog_orgId_cycleYear_cycleMonth_idx" ON "LeaveAccrualLog"("orgId", "cycleYear", "cycleMonth");
CREATE INDEX "LeaveAccrualLog_employeeId_leavePolicyId_idx" ON "LeaveAccrualLog"("employeeId", "leavePolicyId");

ALTER TABLE "LeaveAccrualLog" ADD CONSTRAINT "LeaveAccrualLog_leavePolicyId_fkey" FOREIGN KEY ("leavePolicyId") REFERENCES "LeavePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
