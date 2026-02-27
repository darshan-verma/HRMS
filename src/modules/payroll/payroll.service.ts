import Decimal from "decimal.js";

type PayrollInput = {
  basic: string;
  hra: string;
  allowances: string;
  deductions: string;
};

export function calculatePayroll(input: PayrollInput) {
  const basic = new Decimal(input.basic);
  const hra = new Decimal(input.hra);
  const allowances = new Decimal(input.allowances);
  const deductions = new Decimal(input.deductions);

  const gross = basic.plus(hra).plus(allowances);
  const net = gross.minus(deductions);

  return {
    gross: gross.toFixed(2),
    deductions: deductions.toFixed(2),
    net: net.toFixed(2)
  };
}
