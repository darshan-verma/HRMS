import { describe, expect, it } from "vitest";
import { calculatePayroll } from "@/src/modules/payroll/payroll.service";

describe("payroll calculation", () => {
  it("uses decimal-safe arithmetic", () => {
    const result = calculatePayroll({
      basic: "10000.10",
      hra: "2000.20",
      allowances: "999.70",
      deductions: "100.00"
    });
    expect(result.gross).toBe("13000.00");
    expect(result.net).toBe("12900.00");
  });
});
