"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getAccessToken } from "@/lib/auth/client-tokens";
import { ROLES } from "@/lib/auth/roles";
import {
  AdminDashboard,
  EmployeeDashboard,
  ManagerDashboard,
  HRDashboard,
  PayrollManagerDashboard
} from "@/components/dashboards";

/** Maps role to dashboard component. HR_ADMIN treated as admin for backward compatibility. */
function getDashboardByRole(role: string) {
  switch (role) {
    case ROLES.SUPER_ADMIN:
    case ROLES.HRMS_ADMIN:
    case "HR_ADMIN":
      return "admin";
    case ROLES.EMPLOYEE:
      return "employee";
    case ROLES.MANAGER:
      return "manager";
    case ROLES.HRBP:
      return "hr";
    case ROLES.PAYROLL_MANAGER:
      return "payroll";
    default:
      return "employee";
  }
}

export default function DashboardPage() {
  const { user, loading, refetch } = useAuth();
  const router = useRouter();
  const refetchAttempted = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (getAccessToken() && !refetchAttempted.current) {
        refetchAttempted.current = true;
        refetch();
      } else {
        router.replace("/signin");
      }
      return;
    }
    if (!user.isActive) {
      router.replace("/signin");
    }
  }, [user, loading, router, refetch]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  const userName = user.email.split("@")[0].replace(/[._]/g, " ");
  const role = (user.role ?? "").toUpperCase();
  const dashboard = getDashboardByRole(role);

  if (dashboard === "admin") return <AdminDashboard userName={userName} />;
  if (dashboard === "manager") return <ManagerDashboard userName={userName} />;
  if (dashboard === "hr") return <HRDashboard userName={userName} />;
  if (dashboard === "payroll") return <PayrollManagerDashboard userName={userName} />;
  return <EmployeeDashboard userName={userName} />;
}
