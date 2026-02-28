# Enterprise Payroll — Implementation Roadmap

This document maps the 10 enterprise payroll layers to implementation tasks, schema, and APIs. Use it for prioritisation and sprint planning.

**Implementation status (current):**
- **Layer 1 (Lifecycle):** Implemented. New runs start as `DRAFT`; generate sets `CALCULATING` then `AWAITING_APPROVAL`. Approve → `APPROVED`, Lock → `LOCKED`, Reopen → `REOPENED`. APIs: `POST runs/[id]/approve`, `lock`, `reopen`. Migration: `prisma/migrations/20260228180000_payroll_run_lifecycle/migration.sql`. If your DB was not created with Prisma Migrate, run that SQL manually to add columns.
- **Layer 2 (Financial Summary):** Implemented. `GET runs/[id]/summary` returns totals + compliance; UI shows Financial Summary and Compliance (India) in the View Payslips modal.
- **Audit:** Approve, Lock, Reopen, and Bank Export are audit-logged.
- **Layers 4–10:** See below for remaining work.

---

## 1. Payroll Run Lifecycle (CRITICAL)

**Required states:** `DRAFT` → `CALCULATING` → `AWAITING_APPROVAL` → `APPROVED` → `COMPLETED` → `LOCKED`; restricted `REOPENED`.

**Schema (PayrollRun):**
- `status`: enum/string — DRAFT | CALCULATING | AWAITING_APPROVAL | APPROVED | COMPLETED | LOCKED | REOPENED
- `approvedByUserId`, `approvedAt` (optional)
- `lockedAt`, `lockedByUserId` (optional)
- `reopenedAt`, `reopenedByUserId` (optional)
- `runType`: REGULAR | BONUS | ARREARS | ADJUSTMENT | FNF (for off-cycle)

**Behaviour:**
- **Lock:** When status = COMPLETED → allow "Lock Payroll". Once LOCKED: no salary/attendance/retro changes for that period.
- **Reopen:** Only with permission; audit log; then status → REOPENED (or back to COMPLETED with flag). Restricted role (e.g. SUPER_ADMIN).

**API:**
- `POST /api/v1/payroll/runs/:id/approve`
- `POST /api/v1/payroll/runs/:id/lock`
- `POST /api/v1/payroll/runs/:id/reopen` (with permission check + audit)

**UI:** Run actions: Approve, Lock, Reopen (with confirmation + reason). Status badge reflects lifecycle.

---

## 2. Payroll Financial Summary Block

**Purpose:** Run-level totals shown before approval. Required for finance sign-off.

**Metrics (computed from payslips):**
- Total Employees Processed
- Gross Earnings (sum grossAmount)
- Total Deductions (sum deductionAmount)
- Employer Contributions (employer PF + ESI; employer share computed separately if needed)
- Net Payable (sum netAmount)
- Cost to Company Total (CTC for run = Gross + Employer contributions)

**Schema:** Can be stored in `PayrollRun.summary` JSON when run completes, or computed on demand.

**API:**
- `GET /api/v1/payroll/runs/:id/summary` — returns financial summary + compliance totals.

**UI:** "Financial Summary" block/card on run detail or before Approve: show all 6 metrics. Display when status is AWAITING_APPROVAL or COMPLETED.

---

## 3. Compliance & Statutory (India)

**Metrics:**
- PF Total (Employer + Employee)
- ESI Total
- TDS Total
- Professional Tax
- Gratuity Liability (if applicable — config or formula)

**API:**
- Same summary endpoint can return `compliance: { pfTotal, esiTotal, tdsTotal, professionalTax, gratuityLiability }`.
- `GET /api/v1/payroll/runs/:id/export/pf-challan` (e.g. CSV/Excel)
- `GET /api/v1/payroll/runs/:id/export/tds-report`
- Form 16 data: `GET /api/v1/payroll/forms/form16?year=&employeeId=` (annual)

**UI:** "Compliance Summary" tab or section on run: PF, ESI, TDS, PT, Gratuity. Buttons: Export PF Challan, Export TDS Report, Generate Form 16.

---

## 4. Payroll Validation & Error System

**Pre-run validation (before generating payslips):**
- Missing bank details (employee or org)
- Negative net salary
- Missing attendance data (if policy requires)
- Employee with no salary structure for period
- Duplicate payroll for same period (orgId + period)
- Invalid period (future, or already locked)

**API:**
- `GET /api/v1/payroll/runs/:id/validate` or `POST /api/v1/payroll/validate` (period + orgId). Returns `{ valid: boolean, errors: [{ code, message, employeeId? }] }`.

**UI:** "Pre-Run Validation" step before Generate. Show report; block Generate if critical errors. Allow override with reason (optional, audit).

---

## 5. Audit & Security Layer

**Actions to log (all payroll-sensitive):**
- Who initiated payroll (create run)
- Who approved (approve)
- Who downloaded bank file (bank-export)
- Who viewed salary breakdown (view payslips / run)
- Who reopened payroll (reopen)
- Who locked payroll (lock)

**Implementation:** Use existing `createAuditLog`. Ensure every payroll API that changes state or exports data calls `createAuditLog` with action/resourceType/resourceId and actorUserId.

**Actions:**  
`PAYROLL_RUN_CREATE`, `PAYROLL_RUN_APPROVE`, `PAYROLL_RUN_LOCK`, `PAYROLL_RUN_REOPEN`, `PAYROLL_BANK_EXPORT`, `PAYROLL_RUN_VIEW` (if needed).

---

## 6. Off-Cycle Payroll

**Run types:** REGULAR | BONUS | ARREARS | ADJUSTMENT | FNF (Full & Final).

**Schema:** `PayrollRun.runType` (default REGULAR).

**Behaviour:**
- Bonus/Arrears/Adjustment: run for same or different period; allow negative or one-off components.
- FNF: final settlement run; may include gratuity, leave encashment, notice pay; mark employee as separated.

**API:** Create run with `runType`. Generate logic may branch by runType (e.g. different payslip rules for BONUS/FNF).

**UI:** When creating run, select Run Type. List/filter runs by type.

---

## 7. Retroactive Adjustments & Proration

**Scenario:** Salary revised mid-month → partial month + arrears.

**Logic:**
- For a given month and employee, determine effective salary structure per day (e.g. structure A until date X, structure B after).
- Compute gross per day; sum for month. Arrears = (new monthly − old monthly) × (days after change / days in month), or similar policy.
- Store arrears as separate line or run type ARREARS.

**Implementation:** Extend payslip generation to support proration (effectiveFrom/effectiveTo within month). Add Arrears run or component in regular run.

---

## 8. Bank File Generation

**Requirements:**
- Bank-specific formats (ICICI, HDFC, etc.) — templates per bank.
- NEFT bulk upload format (e.g. RBI-prescribed).
- UTR tracking: store UTR per run or per employee payout; "Mark as Paid" when UTR received.
- Payroll considered closed only after payout confirmation.

**Schema:** Optional `PayrollRun.paidAt`, `PayrollRun.utrReference` or a `PayrollPayout` table (runId, employeeId, amount, utr, paidAt).

**API:**
- `GET /api/v1/payroll/runs/:id/bank-export?format=icici|hdfc|neft|csv`
- `POST /api/v1/payroll/runs/:id/mark-paid` (body: utrReference, paidAt)

**UI:** Export dropdown: CSV, NEFT, ICICI, HDFC. After export, "Mark as Paid" with UTR and date.

---

## 9. Payroll Comparison View

**Metrics:**
- Variance in Gross (vs previous month)
- Variance in Tax (TDS, etc.)
- Variance in Headcount

**API:** `GET /api/v1/payroll/runs/compare?currentRunId= &previousRunId=` or `?period=YYYY-MM&previousPeriod=YYYY-MM`. Returns deltas and percentages.

**UI:** "Compare with previous month" on run detail: table or cards showing current vs previous and variance.

---

## 10. Payroll Ledger System

**Purpose:** Every run generates ledger entries for accounting integration.

**Concepts:**
- Ledger entries: debit/credit by account (salary expense, PF payable, TDS payable, bank, etc.).
- Expense breakdown: by department (from employee.departmentId).
- Cost distribution: department-wise salary cost for the run.

**Schema:** Either extend `PayrollLedger` or add `PayrollLedgerEntry` (runId, accountCode, departmentId?, debit, credit, lineType). Or export to accounting (e.g. CSV for Tally/QuickBooks).

**API:**
- `GET /api/v1/payroll/runs/:id/ledger` — entries for the run.
- `GET /api/v1/payroll/runs/:id/department-cost` — cost by department.

**UI:** "Ledger" / "Cost distribution" tab on run; export for accounting.

---

## Implementation Order (Suggested)

| Phase | Delivered items |
|-------|------------------|
| **P1** | Lifecycle (schema + approve/lock/reopen APIs + audit), Financial summary API + UI, Pre-run validation API + UI |
| **P2** | Compliance summary (PF/ESI/TDS/PT) in summary + tab, Audit on all payroll actions, Bank export audit |
| **P3** | Off-cycle runType + create run with type, Comparison API + UI |
| **P4** | Bank formats (NEFT, 1–2 bank-specific), Mark as Paid + UTR |
| **P5** | Ledger/expense breakdown + department cost, Form 16 / PF challan / TDS export |
| **P6** | Proration + arrears, Gratuity, Reopen permission model |

---

## File / Module Reference

- **Schema:** `prisma/schema.prisma` (PayrollRun, Payslip, AuditLog)
- **Services:** `src/modules/payroll/payslip.service.ts`, `salary-structure.service.ts`, `tax-india.service.ts`
- **APIs:** `app/api/v1/payroll/` (runs, salary-structures, payslips, calculate-tax, runs/generate, runs/bank-export)
- **Audit:** `lib/audit/audit-log.ts`
- **UI:** `app/payroll-ui/page.tsx`
