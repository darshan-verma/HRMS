"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  Building2,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuthOptional } from "@/contexts/auth-context";
import { getNavItemsByRole, getBottomNavItemsByRole, getRoleLabel } from "@/lib/auth/nav-by-role";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthOptional() ?? { user: null, logout: () => {} };

  const navGroups = user ? getNavItemsByRole((user.role ?? "").toUpperCase()) : [];
  const bottomItems = user ? getBottomNavItemsByRole((user.role ?? "").toUpperCase()) : [];

  const displayName = user?.email ? user.email.split("@")[0].replace(/[._]/g, " ") : "User";
  const roleLabel = user ? getRoleLabel((user.role ?? "").toUpperCase()) : "Guest";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-800 bg-sidebar transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
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

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
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
          {user && (
            <li>
              <button
                type="button"
                onClick={logout}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-all hover:bg-sidebar-hover hover:text-white",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? "Sign out" : undefined}
              >
                <LogOut size={20} className="shrink-0" />
                {!collapsed && <span>Sign out</span>}
              </button>
            </li>
          )}
        </ul>

        {!collapsed && user && (
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-sidebar-hover px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
              <p className="truncate text-[11px] text-slate-400">{roleLabel}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
