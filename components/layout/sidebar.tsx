"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ChevronLeft,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/employees", label: "Employees", icon: Users }
    ]
  },
  {
    label: "Time & Attendance",
    items: [
      { href: "/attendance-ui", label: "Attendance", icon: Clock },
      { href: "/leave-ui", label: "Leave", icon: CalendarOff },
      { href: "/shifts", label: "Shifts", icon: Timer }
    ]
  },
  {
    label: "Finance",
    items: [{ href: "/payroll-ui", label: "Payroll", icon: Wallet }]
  },
  {
    label: "Talent",
    items: [{ href: "/recruitment-ui", label: "Recruitment", icon: UserPlus }]
  },
  {
    label: "Insights",
    items: [{ href: "/analytics", label: "Analytics", icon: BarChart3 }]
  }
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help Center", icon: HelpCircle }
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-800 bg-sidebar transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Building2 size={20} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="truncate text-sm font-semibold text-white">Enterprise HRMS</h1>
            <p className="truncate text-[11px] text-slate-400">Human Resources</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-sidebar-hover hover:text-white",
            collapsed && "ml-0"
          )}
        >
          <ChevronLeft size={16} className={cn("transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navItems.map((group) => (
          <div key={group.label} className="mb-6">
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        isActive
                          ? "bg-brand-600/20 text-brand-400"
                          : "text-slate-400 hover:bg-sidebar-hover hover:text-white",
                        collapsed && "justify-center px-2"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon
                        size={20}
                        className={cn(
                          "shrink-0",
                          isActive ? "text-brand-400" : "text-slate-500 group-hover:text-white"
                        )}
                      />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom items */}
      <div className="border-t border-slate-800 px-3 py-3">
        <ul className="space-y-0.5">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-brand-600/20 text-brand-400"
                      : "text-slate-400 hover:bg-sidebar-hover hover:text-white",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon
                    size={20}
                    className={cn(
                      "shrink-0",
                      isActive ? "text-brand-400" : "text-slate-500 group-hover:text-white"
                    )}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* User Avatar */}
        {!collapsed && (
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-sidebar-hover px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              DA
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">Darshan Admin</p>
              <p className="truncate text-[11px] text-slate-400">HR Administrator</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
