import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { IndiaTaxService } from "@/src/modules/payroll/tax-india.service";

const EPF_RATE = new Decimal("0.12");
const ESI_RATE = new Decimal("0.0075");

export class PayslipService {
  private readonly taxService = new IndiaTaxService();

  async createPayrollRun(input: {
    orgId: string;
    period: string;
    createdByUserId?: string;
  }) {
    return prisma.payrollRun.create({
      data: {
        orgId: input.orgId,
        period: input.period,
        status: "DRAFT",
        createdByUserId: input.createdByUserId
      }
    });
  }

  async generateRunPayslips(input: {
    orgId: string;
    payrollRunId: string;
    regime: "OLD" | "NEW";
  }) {
    const run = await prisma.payrollRun.findFirst({
      where: { id: input.payrollRunId, orgId: input.orgId }
    });
    if (!run) throw new Error("Payroll run not found");
    if (run.status !== "DRAFT")
      throw new Error(`Payroll run cannot be generated from status ${run.status}. Must be DRAFT.`);

    await prisma.payrollRun.update({
      where: { id: run.id },
      data: { status: "CALCULATING" }
    });

    const employees = await prisma.employee.findMany({
      where: { orgId: input.orgId, isDeleted: false }
    });

    let generated = 0;
    for (const employee of employees) {
      const structure = await prisma.salaryStructure.findFirst({
        where: {
          orgId: input.orgId,
          employeeId: employee.id,
          effectiveFrom: { lte: new Date() },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }]
        },
        orderBy: { effectiveFrom: "desc" }
      });
      if (!structure) continue;

      const gross = new Decimal(structure.basic.toString())
        .plus(new Decimal(structure.hra.toString()))
        .plus(new Decimal(structure.specialAllowance.toString()))
        .plus(new Decimal(structure.otherAllowance.toString()));

      const annual = gross.mul("12");
      const monthlyTds = new Decimal(
        this.taxService.calculateAnnualTax({
          annualTaxableIncome: annual.toFixed(2),
          regime: input.regime
        }).monthlyTds
      );
      const epf = structure.epfApplicable
        ? new Decimal(structure.basic.toString()).mul(EPF_RATE)
        : new Decimal(0);
      const esi = structure.esiApplicable ? gross.mul(ESI_RATE) : new Decimal(0);
      const professionalTax = new Decimal(structure.professionalTax.toString());
      const deduction = monthlyTds.plus(epf).plus(esi).plus(professionalTax);
      const net = gross.minus(deduction);

      await prisma.$transaction([
        prisma.payslip.create({
          data: {
            orgId: input.orgId,
            employeeId: employee.id,
            payrollRunId: run.id,
            period: run.period,
            grossAmount: gross.toFixed(2),
            deductionAmount: deduction.toFixed(2),
            netAmount: net.toFixed(2),
            taxDeduction: monthlyTds.toFixed(2),
            epfDeduction: epf.toFixed(2),
            esiDeduction: esi.toFixed(2)
          }
        }),
        prisma.payrollLedger.create({
          data: {
            orgId: input.orgId,
            employeeId: employee.id,
            period: run.period,
            grossAmount: gross.toFixed(2),
            deductions: deduction.toFixed(2),
            netAmount: net.toFixed(2),
            metadata: {
              payrollRunId: run.id,
              tds: monthlyTds.toFixed(2),
              epf: epf.toFixed(2),
              esi: esi.toFixed(2)
            }
          }
        })
      ]);
      generated += 1;
    }

    await prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        status: "AWAITING_APPROVAL",
        completedAt: new Date(),
        summary: { generated }
      }
    });

    return { generated };
  }

  /** Valid transitions: AWAITING_APPROVAL → APPROVED */
  async approveRun(input: {
    orgId: string;
    payrollRunId: string;
    approvedByUserId: string;
  }) {
    const run = await prisma.payrollRun.findFirst({
      where: { id: input.payrollRunId, orgId: input.orgId }
    });
    if (!run) throw new Error("Payroll run not found");
    if (run.status !== "AWAITING_APPROVAL")
      throw new Error(`Cannot approve: run status is ${run.status}. Must be AWAITING_APPROVAL.`);

    return prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        status: "APPROVED",
        approvedByUserId: input.approvedByUserId,
        approvedAt: new Date()
      } as Prisma.PayrollRunUncheckedUpdateInput
    });
  }

  /** Valid transitions: APPROVED | COMPLETED → LOCKED. Locks payroll (no retro changes). */
  async lockRun(input: {
    orgId: string;
    payrollRunId: string;
    lockedByUserId: string;
  }) {
    const run = await prisma.payrollRun.findFirst({
      where: { id: input.payrollRunId, orgId: input.orgId }
    });
    if (!run) throw new Error("Payroll run not found");
    const allowed = ["APPROVED", "COMPLETED"];
    if (!allowed.includes(run.status))
      throw new Error(`Cannot lock: run status is ${run.status}. Must be APPROVED or COMPLETED.`);

    return prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        status: "LOCKED",
        lockedAt: new Date(),
        lockedByUserId: input.lockedByUserId
      } as Prisma.PayrollRunUncheckedUpdateInput
    });
  }

  /** Valid transitions: LOCKED → REOPENED. Restricted; caller must enforce permission and audit. */
  async reopenRun(input: {
    orgId: string;
    payrollRunId: string;
    reopenedByUserId: string;
  }) {
    const run = await prisma.payrollRun.findFirst({
      where: { id: input.payrollRunId, orgId: input.orgId }
    });
    if (!run) throw new Error("Payroll run not found");
    if (run.status !== "LOCKED")
      throw new Error(`Cannot reopen: run status is ${run.status}. Must be LOCKED.`);

    return prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        status: "REOPENED",
        reopenedAt: new Date(),
        reopenedByUserId: input.reopenedByUserId
      } as Prisma.PayrollRunUncheckedUpdateInput
    });
  }

  /** Financial + compliance summary for a payroll run (from payslips). */
  async getRunSummary(payrollRunId: string, orgId: string) {
    const run = await prisma.payrollRun.findFirst({
      where: { id: payrollRunId, orgId }
    });
    if (!run) return null;

    const payslips = await prisma.payslip.findMany({
      where: { payrollRunId, orgId }
    });

    const totalEmployees = payslips.length;
    const grossEarnings = payslips.reduce((s, p) => s + Number(p.grossAmount), 0);
    const totalDeductions = payslips.reduce((s, p) => s + Number(p.deductionAmount), 0);
    const netPayable = payslips.reduce((s, p) => s + Number(p.netAmount), 0);
    const tdsTotal = payslips.reduce((s, p) => s + Number(p.taxDeduction), 0);
    const pfEmployee = payslips.reduce((s, p) => s + Number(p.epfDeduction), 0);
    const esiEmployee = payslips.reduce((s, p) => s + Number(p.esiDeduction), 0);
    // Employer PF = employee PF (12% each); employer ESI ~3.25% of gross (simplified)
    const pfEmployer = pfEmployee;
    const esiEmployer = payslips.reduce((s, p) => s + Number(p.grossAmount) * 0.0325, 0);
    const costToCompany = grossEarnings + pfEmployer + esiEmployer;

    return {
      payrollRunId: run.id,
      period: run.period,
      status: run.status,
      totalEmployeesProcessed: totalEmployees,
      grossEarnings: Math.round(grossEarnings * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      employerContributions: Math.round((pfEmployer + esiEmployer) * 100) / 100,
      netPayable: Math.round(netPayable * 100) / 100,
      costToCompanyTotal: Math.round(costToCompany * 100) / 100,
      compliance: {
        pfTotal: Math.round((pfEmployee + pfEmployer) * 100) / 100,
        pfEmployee: Math.round(pfEmployee * 100) / 100,
        pfEmployer: Math.round(pfEmployer * 100) / 100,
        esiTotal: Math.round((esiEmployee + esiEmployer) * 100) / 100,
        esiEmployee: Math.round(esiEmployee * 100) / 100,
        esiEmployer: Math.round(esiEmployer * 100) / 100,
        tdsTotal: Math.round(tdsTotal * 100) / 100,
        professionalTax: null as number | null // not stored per-payslip in aggregate; can add if needed
      }
    };
  }

  async bankExportCsv(orgId: string, payrollRunId: string) {
    const payslips = await prisma.payslip.findMany({
      where: { orgId, payrollRunId },
      include: {
        employee: { select: { employeeCode: true, fullName: true } }
      }
    });
    const header = "employee_code,employee_name,amount";
    const rows = payslips.map((p) =>
      [p.employee.employeeCode, p.employee.fullName, p.netAmount.toString()].join(",")
    );
    return [header, ...rows].join("\n");
  }
}
