"use client";

import { Bell, Search, MessageSquare, LogOut } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SearchCommand } from "@/components/search-command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getRefreshToken, getStoredOrgId, getAccessToken, clearAuth } from "@/lib/auth/client-tokens";

interface TopHeaderProps {
  title: string;
  subtitle?: string;
}

type User = { id: string; email: string; role: string; orgId: string } | null;

export function TopHeader({ title, subtitle }: TopHeaderProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [user, setUser] = useState<User>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    fetch("/api/v1/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down, true);
    return () => document.removeEventListener("keydown", down, true);
  }, []);

  const handleLogout = () => {
    const refreshToken = getRefreshToken();
    const orgId = getStoredOrgId();
    setLoggingOut(true);
    if (refreshToken && orgId) {
      fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken, orgId })
      }).finally(() => {
        clearAuth();
        setProfileOpen(false);
        setLoggingOut(false);
        router.push("/signin");
        router.refresh();
      });
    } else {
      clearAuth();
      setProfileOpen(false);
      setLoggingOut(false);
      router.push("/signin");
      router.refresh();
    }
  };

  const displayName = user?.email?.split("@")[0] ?? "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const roleLabel = user?.role?.replace(/_/g, " ") ?? "Admin";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-sm">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <button
            ref={searchTriggerRef}
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 md:flex"
          >
            <Search size={16} />
            <span>Search...</span>
            <kbd className="ml-8 rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 shadow-sm">
              Ctrl K
            </kbd>
          </button>

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

        {/* User profile dropdown */}
        <Popover open={profileOpen} onOpenChange={setProfileOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              aria-haspopup="true"
              aria-expanded={profileOpen}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                {initials}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-slate-700">{displayName}</p>
                <p className="text-[11px] text-slate-400">{roleLabel}</p>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-64 p-0">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="truncate text-sm font-medium text-slate-900">{user?.email ?? "—"}</p>
              <p className="text-xs capitalize text-slate-500">{roleLabel}</p>
            </div>
            <div className="p-1">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-rose-700 focus:outline-none focus:ring-1 focus:ring-slate-200 disabled:opacity-50"
              >
                <LogOut size={16} />
                {loggingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
    <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} triggerRef={searchTriggerRef} />
    </>
  );
}
