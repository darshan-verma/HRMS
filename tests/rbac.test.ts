import { describe, expect, it } from "vitest";
import { PERMISSIONS, hasPermission } from "@/lib/auth/rbac";

describe("rbac", () => {
  it("allows HR admin to create employees", () => {
    expect(hasPermission("HR_ADMIN", PERMISSIONS.EMPLOYEE_WRITE)).toBe(true);
  });

  it("denies employee for payroll write", () => {
    expect(hasPermission("EMPLOYEE", PERMISSIONS.PAYROLL_WRITE)).toBe(false);
  });
});
