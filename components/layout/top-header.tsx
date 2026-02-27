"use client";

import { Bell, Search, MessageSquare } from "lucide-react";

interface TopHeaderProps {
  title: string;
  subtitle?: string;
}

export function TopHeader({ title, subtitle }: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-sm">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 md:flex">
          <Search size={16} />
          <span>Search...</span>
          <kbd className="ml-8 rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 shadow-sm">
            Ctrl K
          </kbd>
        </div>

        {/* Notification icons */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <MessageSquare size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-500" />
        </button>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
        </button>

        {/* Divider */}
        <div className="mx-1 h-8 w-px bg-slate-200" />

        {/* User */}
        <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
            DA
          </div>
          <div className="hidden text-left md:block">
            <p className="text-sm font-medium text-slate-700">Darshan</p>
            <p className="text-[11px] text-slate-400">Admin</p>
          </div>
        </button>
      </div>
    </header>
  );
}
