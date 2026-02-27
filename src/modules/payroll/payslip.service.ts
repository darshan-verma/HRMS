import { prisma } from "@/lib/prisma";
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
        status: "PENDING",
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
        status: "COMPLETED",
        completedAt: new Date(),
        summary: { generated }
      }
    });

    return { generated };
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
