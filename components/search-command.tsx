"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
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
  HelpCircle
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem
} from "cmdk";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export type SearchPage = {
  href: string;
  label: string;
  keywords?: string[];
  icon: React.ComponentType<{ size?: number; className?: string }>;
  group: string;
};

const SEARCH_PAGES: SearchPage[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Main", keywords: ["home", "overview"] },
  { href: "/employees", label: "Employees", icon: Users, group: "Main", keywords: ["staff", "people", "team"] },
  { href: "/attendance-ui", label: "Attendance", icon: Clock, group: "Time & Attendance", keywords: ["clock", "check-in", "time"] },
  { href: "/leave-ui", label: "Leave", icon: CalendarOff, group: "Time & Attendance", keywords: ["pto", "vacation", "holiday", "absence"] },
  { href: "/shifts", label: "Shifts", icon: Timer, group: "Time & Attendance", keywords: ["schedule", "roster", "timing"] },
  { href: "/payroll-ui", label: "Payroll", icon: Wallet, group: "Finance", keywords: ["salary", "wages", "pay", "compensation"] },
  { href: "/recruitment-ui", label: "Recruitment", icon: UserPlus, group: "Talent", keywords: ["hiring", "jobs", "candidates", "applicants"] },
  { href: "/analytics", label: "Analytics", icon: BarChart3, group: "Insights", keywords: ["reports", "metrics", "stats", "dashboard"] },
  { href: "/settings", label: "Settings", icon: Settings, group: "General", keywords: ["config", "preferences", "admin"] },
  { href: "/help", label: "Help Center", icon: HelpCircle, group: "General", keywords: ["support", "faq", "docs"] }
];

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ref to the trigger element (search bar button) to position the dialog below it */
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export function SearchCommand({ open, onOpenChange, triggerRef }: SearchCommandProps) {
  const router = useRouter();
  const [position, setPosition] = React.useState<{ top: number; left: number; width: number } | null>(null);

  React.useLayoutEffect(() => {
    if (!open) return;
    const el = triggerRef?.current;
    const maxWidth = 512;
    const gap = 4;
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const width = Math.min(maxWidth, Math.max(rect.width, 384));
        let left = rect.left;
        const rightEdge = left + width;
        if (rightEdge > window.innerWidth) left = Math.max(0, window.innerWidth - width);
        if (left < 0) left = 0;
        setPosition({
          top: rect.bottom + gap,
          left,
          width
        });
        return;
      }
    }
    setPosition({ top: 72 + 8, left: 24, width: Math.min(maxWidth, 480) });
  }, [open, triggerRef]);

  const runCommand = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const groups = SEARCH_PAGES.reduce<Record<string, SearchPage[]>>((acc, page) => {
    if (!acc[page.group]) acc[page.group] = [];
    acc[page.group].push(page);
    return acc;
  }, {});

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed z-50 rounded-xl border border-slate-200 bg-white shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-w-lg"
          style={
            position
              ? { top: position.top, left: position.left, width: position.width }
              : open
                ? { top: 80, left: 24, width: 480 }
                : undefined
          }
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Title className="sr-only">Search pages</Dialog.Title>
          <Command label="Search pages" className="flex flex-col overflow-hidden">
            <div className="flex items-center border-b border-slate-200 px-3" cmdk-input-wrapper="">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-slate-500" />
              <CommandInput
                placeholder="Search pages..."
                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <CommandList className="max-h-[320px] overflow-y-auto p-1">
              <CommandEmpty className="py-6 text-center text-sm text-slate-500">
                No page found. Try a different search.
              </CommandEmpty>
              {Object.entries(groups).map(([groupName, pages]) => (
                <CommandGroup
                  key={groupName}
                  heading={groupName}
                  className="overflow-hidden p-1 text-slate-900 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-slate-500"
                >
                  {pages.map((page) => (
                    <CommandItem
                      key={page.href}
                      value={page.label}
                      keywords={[...(page.keywords ?? []), page.group]}
                      onSelect={() => runCommand(page.href)}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center gap-3 rounded-md px-2 py-2.5 text-sm outline-none",
                        "aria-selected:bg-slate-100 aria-selected:text-slate-900",
                        "data-[disabled='true']:pointer-events-none data-[disabled='true']:opacity-50"
                      )}
                    >
                      <page.icon size={18} className="shrink-0 text-slate-500" />
                      <span>{page.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
