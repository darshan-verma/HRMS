/**
 * HRMS role constants. Used for login redirect, sidebar, and API authorization.
 * - EMPLOYEE: Self-service only (attendance, leave, payslips)
 * - MANAGER: Manager Self-Service (MSS) – team view, leave approvals
 * - HRBP: HR Business Partner / HR Executive – employees, leave, recruitment
 * - PAYROLL_MANAGER: Salary / Payroll – payroll runs, payslips, salary structures
 * - HRMS_ADMIN: Full HRMS admin – all modules and settings
 * - SUPER_ADMIN: System-level super admin (seed)
 */
export const ROLES = {
  EMPLOYEE: "EMPLOYEE",
  MANAGER: "MANAGER",
  HRBP: "HRBP",
  PAYROLL_MANAGER: "PAYROLL_MANAGER",
  HRMS_ADMIN: "HRMS_ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN"
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.EMPLOYEE]: "Employee",
  [ROLES.MANAGER]: "Manager (MSS)",
  [ROLES.HRBP]: "HR (HRBP / HR Executive)",
  [ROLES.PAYROLL_MANAGER]: "Salary / Payroll Manager",
  [ROLES.HRMS_ADMIN]: "HRMS Admin",
  [ROLES.SUPER_ADMIN]: "Super Admin"
};

/** Default dashboard path per role (after login). */
export function getDashboardPathForRole(role: string): string {
  return "/dashboard";
}

/** Roles that see the "admin" style full dashboard. */
export function isAdminRole(role: string): boolean {
  return role === ROLES.HRMS_ADMIN || role === ROLES.SUPER_ADMIN;
}
