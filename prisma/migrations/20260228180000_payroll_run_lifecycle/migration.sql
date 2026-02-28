-- Enterprise payroll: lifecycle and run type on PayrollRun
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "runType" TEXT NOT NULL DEFAULT 'REGULAR';
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "approvedByUserId" TEXT;
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3);
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "lockedByUserId" TEXT;
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "reopenedAt" TIMESTAMP(3);
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "reopenedByUserId" TEXT;

-- Backfill status: PENDING -> DRAFT, COMPLETED stays (optional: set AWAITING_APPROVAL for completed runs that need approval flow later)
-- No data change here; app will use new statuses for new runs.
