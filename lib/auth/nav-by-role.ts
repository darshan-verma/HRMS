import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarOff,
  Wallet,
  UserPlus,
  BarChart3,
  Timer,
  Settings,
  HelpCircle,
  UserCog,
  type LucideIcon
} from "lucide-react";
import { hasPermission } from "./rbac";
import { ROLE_LABELS } from "./roles";

export type NavItem = { href: string; label: string; icon: LucideIcon; permission?: string };
export type NavGroup = { label: string; items: NavItem[] };

const ALL_NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/employees", label: "Employees", icon: Users, permission: "employee.read" }
    ]
  },
  {
    label: "Time & Attendance",
    items: [
      { href: "/attendance-ui", label: "Attendance", icon: Clock, permission: "attendance.read" },
      { href: "/leave-ui", label: "Leave", icon: CalendarOff, permission: "leave.read" },
      { href: "/shifts", label: "Shifts", icon: Timer, permission: "shift.read" }
    ]
  },
  {
    label: "Finance",
    items: [{ href: "/payroll-ui", label: "Payroll", icon: Wallet, permission: "payroll.read" }]
  },
  {
    label: "Talent",
    items: [
      {
        href: "/recruitment-ui",
        label: "Recruitment",
        icon: UserPlus,
        permission: "recruitment.read"
      }
    ]
  },
  {
    label: "Insights",
    items: [{ href: "/analytics", label: "Analytics", icon: BarChart3, permission: "audit.read" }]
  }
];

const BOTTOM_ITEMS: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings.read" },
  { href: "/settings/users", label: "User management", icon: UserCog, permission: "user.read" },
  { href: "/help", label: "Help Center", icon: HelpCircle }
];

/** Returns nav groups with items filtered by role permissions. */
export function getNavItemsByRole(role: string): NavGroup[] {
  return ALL_NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => {
      if (!item.permission) return true;
      return hasPermission(role, item.permission as Parameters<typeof hasPermission>[1]);
    })
  })).filter((group) => group.items.length > 0);
}

/** Returns bottom nav items (settings requires permission; Help always shown). */
export function getBottomNavItemsByRole(role: string): NavItem[] {
  return BOTTOM_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(role, item.permission as Parameters<typeof hasPermission>[1]);
  });
}

/** Dashboard link for employee: still /dashboard; content is role-based. */
export function getDashboardHref(role: string): string {
  return "/dashboard";
}

/** Role label for display in sidebar. */
export function getRoleLabel(role: string): string {
  return (ROLE_LABELS as Record<string, string>)[role] ?? role;
}
