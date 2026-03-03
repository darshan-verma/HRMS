"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Inbox,
  Users,
  Home,
  Timer,
  Calendar as CalendarIcon,
  FileText,
  Eye,
  Pencil,
  FileSpreadsheet,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  ChevronDown
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal, FormField, Input, Textarea } from "@/components/ui/modal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

const ORG_ID = "seed-org";
const ACTOR_ROLE = "HR_ADMIN";
const ACTOR_USER_ID = "seed-user";

type AttendanceSummary = {
  employeesPresentToday: number;
  employeesAbsent: number;
  lateCheckIns: number;
  onLeave: number;
  workFromHome: number;
  overtimeHoursToday: number;
  totalEmployees: number;
  expectedToday: number;
};

type AttendanceRow = {
  id: string;
  employeeId: string;
  attendanceDate: string;
  status: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  workingHoursMinutes: number;
  overtimeMinutes: number;
  derivedStatus: string;
  isLate: boolean;
  employee?: { fullName: string; employeeCode: string };
  shift?: { id: string; name: string; code?: string | null } | null;
};

type RealtimeView = {
  currentlyWorking: { id: string; employeeId: string; fullName: string; employeeCode: string; checkInAt: string | null }[];
  checkedOut: { id: string; employeeId: string; fullName: string; employeeCode: string; checkInAt: string | null; checkOutAt: string | null }[];
  onLeave: { employeeId: string; fullName: string; employeeCode: string }[];
  absentCount: number;
};

type CalendarData = {
  attendance: {
    id: string;
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    date: string;
    status: string;
    derivedStatus: string;
    checkInAt: string | null;
    checkOutAt: string | null;
    workingHoursMinutes: number;
    overtimeMinutes: number;
  }[];
  leave: {
    id: string;
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    leaveType: string;
    startDate: string;
    endDate: string;
  }[];
};

type TabId = "daily" | "my" | "regularization" | "overtime" | "reports";

type RegularizationRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  date: string;
  type: "MISSING_PUNCH" | "LATE_REASON" | "EARLY_EXIT";
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
};

const statusBadge: Record<string, "success" | "danger" | "warning" | "info" | "outline"> = {
  PRESENT: "success",
  ABSENT: "danger",
  LATE: "warning",
  HALF_DAY: "info",
  ON_LEAVE: "outline"
};

function formatTime(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatHoursMinutes(minutes: number): string {
  if (minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export default function AttendanceUiPage() {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryDate, setSummaryDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [tableLoading, setTableLoading] = useState(false);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [realtime, setRealtime] = useState<RealtimeView | null>(null);
  const [realtimeLoading, setRealtimeLoading] = useState(false);

  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const [activeTab, setActiveTab] = useState<TabId>("daily");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [detailsModalRecord, setDetailsModalRecord] = useState<AttendanceRow | null>(null);
  const [correctModalRecord, setCorrectModalRecord] = useState<AttendanceRow | null>(null);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualEmployeeId, setManualEmployeeId] = useState("");
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualStatus, setManualStatus] = useState<"PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE">("PRESENT");
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; fullName: string; employeeCode: string }[]>([]);

  const [regularizationModalOpen, setRegularizationModalOpen] = useState(false);
  const [regEmployeeId, setRegEmployeeId] = useState("");
  const [regEmployeePopoverOpen, setRegEmployeePopoverOpen] = useState(false);
  const [regDate, setRegDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [regType, setRegType] = useState<"MISSING_PUNCH" | "LATE_REASON" | "EARLY_EXIT">("MISSING_PUNCH");
  const [regReason, setRegReason] = useState("");

  const [regularizationRequests, setRegularizationRequests] = useState<RegularizationRequest[]>([]);

  const queryBase = useMemo(
    () => new URLSearchParams({ orgId: ORG_ID, actorRole: ACTOR_ROLE }).toString(),
    []
  );

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(
        `/api/v1/attendance/summary?${queryBase}&date=${summaryDate}T00:00:00.000Z`,
        { cache: "no-store" }
      );
      if (res.ok) setSummary((await res.json()) as AttendanceSummary);
      else setError(await res.text());
    } catch {
      setError("Failed to load summary");
    }
    setSummaryLoading(false);
  }, [queryBase, summaryDate]);

  const loadTable = useCallback(async () => {
    setTableLoading(true);
    setError(null);
    try {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      const qs = new URLSearchParams({
        ...Object.fromEntries(new URLSearchParams(queryBase).entries()),
        from: from.toISOString(),
        to: to.toISOString(),
        page: String(page),
        pageSize: String(pageSize)
      });
      const res = await fetch(`/api/v1/attendance?${qs.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { items: AttendanceRow[]; total: number };
        setRows(data.items ?? []);
        setTotal(data.total ?? 0);
      } else {
        setError(await res.text());
      }
    } catch {
      setError("Failed to load attendance");
    }
    setTableLoading(false);
  }, [queryBase, fromDate, toDate, page, pageSize]);

  const loadRealtime = useCallback(async () => {
    setRealtimeLoading(true);
    try {
      const res = await fetch(
        `/api/v1/attendance/realtime?${queryBase}&date=${summaryDate}T00:00:00.000Z`,
        { cache: "no-store" }
      );
      if (res.ok) setRealtime((await res.json()) as RealtimeView);
    } catch {
      // ignore
    }
    setRealtimeLoading(false);
  }, [queryBase, summaryDate]);

  const loadCalendar = useCallback(async () => {
    setCalendarLoading(true);
    const start = new Date(calendarMonth.year, calendarMonth.month, 1);
    const end = new Date(calendarMonth.year, calendarMonth.month + 1, 0, 23, 59, 59);
    const qs = new URLSearchParams({
      ...Object.fromEntries(new URLSearchParams(queryBase).entries()),
      from: start.toISOString(),
      to: end.toISOString()
    });
    try {
      const res = await fetch(`/api/v1/attendance/calendar?${qs.toString()}`, { cache: "no-store" });
      if (res.ok) setCalendar((await res.json()) as CalendarData);
    } catch {
      // ignore
    }
    setCalendarLoading(false);
  }, [queryBase, calendarMonth.year, calendarMonth.month]);

  const loadEmployees = useCallback(async () => {
    const res = await fetch(`/api/v1/employees?${queryBase}&page=1&pageSize=500`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setEmployees(data.items ?? data.employees ?? []);
    }
  }, [queryBase]);

  useEffect(() => {
    if (manualEntryOpen && employees.length === 0) void loadEmployees();
  }, [manualEntryOpen, employees.length, loadEmployees]);

  useEffect(() => {
    if (regularizationModalOpen && employees.length === 0) void loadEmployees();
  }, [regularizationModalOpen, employees.length, loadEmployees]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (activeTab === "daily" || activeTab === "my" || activeTab === "overtime") void loadTable();
  }, [activeTab, loadTable]);

  useEffect(() => {
    void loadRealtime();
  }, [loadRealtime]);

  useEffect(() => {
    if (activeTab === "daily") void loadCalendar();
  }, [activeTab, loadCalendar]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const overtimeRows = useMemo(
    () => rows.filter((r) => r.overtimeMinutes > 0),
    [rows]
  );

  const tabs: { id: TabId; label: string; icon: typeof Clock }[] = [
    { id: "daily", label: "Daily Attendance", icon: Clock },
    { id: "my", label: "My Attendance", icon: Users },
    { id: "regularization", label: "Regularization Requests", icon: FileText },
    { id: "overtime", label: "Overtime", icon: Timer },
    { id: "reports", label: "Reports", icon: FileSpreadsheet }
  ];

  return (
    <DashboardLayout
      title="Attendance"
      subtitle="Track and manage daily employee attendance with shift integration"
    >
      {toast && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {toast}
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* 1. Attendance Dashboard – Top Summary */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">Today&apos;s Overview</h2>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={summaryDate}
            onChange={(e) => setSummaryDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <Button variant="outline" size="sm" onClick={loadSummary}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Present Today"
          value={summaryLoading ? "—" : String(summary?.employeesPresentToday ?? 0)}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Absent"
          value={summaryLoading ? "—" : String(summary?.employeesAbsent ?? 0)}
          icon={XCircle}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
        />
        <StatCard
          label="Late Check-ins"
          value={summaryLoading ? "—" : String(summary?.lateCheckIns ?? 0)}
          icon={AlertCircle}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          label="On Leave"
          value={summaryLoading ? "—" : String(summary?.onLeave ?? 0)}
          icon={Inbox}
          iconColor="text-slate-600"
          iconBg="bg-slate-100"
        />
        <StatCard
          label="Work From Home"
          value={summaryLoading ? "—" : String(summary?.workFromHome ?? 0)}
          icon={Home}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          label="Overtime Hours Today"
          value={summaryLoading ? "—" : String(summary?.overtimeHoursToday ?? 0)}
          icon={Timer}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
      </div>

      {/* Real-Time Attendance View */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Real-Time View</CardTitle>
        </CardHeader>
        <CardContent>
          {realtimeLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-emerald-50/50 p-4">
                <p className="text-xs font-medium uppercase text-slate-500">Currently Working</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {realtime?.currentlyWorking?.length ?? 0}
                </p>
                {realtime?.currentlyWorking?.length ? (
                  <p className="mt-1 truncate text-xs text-slate-600">
                    {realtime.currentlyWorking.slice(0, 2).map((e) => e.fullName).join(", ")}
                    {realtime.currentlyWorking.length > 2 ? "…" : ""}
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase text-slate-500">Checked Out</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {realtime?.checkedOut?.length ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-amber-50/50 p-4">
                <p className="text-xs font-medium uppercase text-slate-500">On Leave</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {realtime?.onLeave?.length ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-rose-50/50 p-4">
                <p className="text-xs font-medium uppercase text-slate-500">Absent</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {summary?.employeesAbsent ?? 0}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="mt-6 border-b border-slate-200">
        <nav className="flex gap-1" aria-label="Attendance tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-brand-500 text-brand-600"
                  : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "daily" && (
          <>
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
                <CardTitle>Daily Attendance</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-slate-500" />
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <Button size="sm" onClick={() => setManualEntryOpen(true)}>
                    <Plus size={14} /> Add manual entry
                  </Button>
                  <Button variant="outline" size="sm" onClick={loadTable}>
                    <RefreshCw size={14} /> Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tableLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : rows.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="No attendance records"
                    description="No records for the selected period. Use Add manual entry or check-in/check-out to record attendance."
                  />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <Table>
                      <THead>
                        <tr>
                          <TH>Employee</TH>
                          <TH>Date</TH>
                          <TH>Shift</TH>
                          <TH>Check-in</TH>
                          <TH>Check-out</TH>
                          <TH>Working Hours</TH>
                          <TH>Status</TH>
                          <TH>Overtime</TH>
                          <TH>Actions</TH>
                        </tr>
                      </THead>
                      <TBody>
                        {rows.map((row) => (
                          <tr
                            key={row.id}
                            className="border-t border-slate-100 transition-colors hover:bg-slate-50/50"
                          >
                            <TD>
                              <div>
                                <p className="font-medium">{row.employee?.fullName ?? "—"}</p>
                                <p className="text-xs text-slate-500">
                                  {row.employee?.employeeCode ?? "—"}
                                </p>
                              </div>
                            </TD>
                            <TD className="whitespace-nowrap">{formatDate(row.attendanceDate)}</TD>
                            <TD>
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                                {row.shift?.name ?? "—"}
                              </span>
                            </TD>
                            <TD className="whitespace-nowrap">{formatTime(row.checkInAt)}</TD>
                            <TD className="whitespace-nowrap">{formatTime(row.checkOutAt)}</TD>
                            <TD className="whitespace-nowrap">
                              {formatHoursMinutes(row.workingHoursMinutes)}
                            </TD>
                            <TD>
                              <Badge variant={statusBadge[row.derivedStatus] ?? "outline"}>
                                {row.derivedStatus}
                              </Badge>
                            </TD>
                            <TD className="whitespace-nowrap">
                              {row.overtimeMinutes > 0
                                ? formatHoursMinutes(row.overtimeMinutes)
                                : "—"}
                            </TD>
                            <TD>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() => setDetailsModalRecord(row)}
                                  title="View details"
                                >
                                  <Eye size={14} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() => setCorrectModalRecord(row)}
                                  title="Correct attendance"
                                >
                                  <Pencil size={14} />
                                </Button>
                              </div>
                            </TD>
                          </tr>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                )}
                {total > pageSize && (
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <p className="text-sm text-slate-600">
                      Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
                      {total}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Calendar View */}
            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon size={18} />
                  Attendance Calendar
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCalendarMonth((m) =>
                        m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 }
                      )
                    }
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="min-w-[140px] text-center text-sm font-medium">
                    {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString("en-IN", {
                      month: "long",
                      year: "numeric"
                    })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCalendarMonth((m) =>
                        m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 }
                      )
                    }
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {calendarLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                            <th key={d} className="border border-slate-200 bg-slate-50 p-2 text-center">
                              {d}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const start = new Date(calendarMonth.year, calendarMonth.month, 1);
                          const daysInMonth = new Date(
                            calendarMonth.year,
                            calendarMonth.month + 1,
                            0
                          ).getDate();
                          const firstDay = start.getDay();
                          const byDate: Record<
                            string,
                            { present: number; leave: number; late: number }
                          > = {};
                          for (let d = 1; d <= daysInMonth; d++) {
                            const key = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                            byDate[key] = { present: 0, leave: 0, late: 0 };
                          }
                          calendar?.attendance?.forEach((a) => {
                            const d = new Date(a.date);
                            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                            if (byDate[key]) {
                              byDate[key].present += 1;
                              if (a.derivedStatus === "LATE") byDate[key].late += 1;
                            }
                          });
                          calendar?.leave?.forEach((l) => {
                            const startL = new Date(l.startDate);
                            const endL = new Date(l.endDate);
                            for (let d = new Date(startL); d <= endL; d.setDate(d.getDate() + 1)) {
                              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                              if (byDate[key]) byDate[key].leave += 1;
                            }
                          });
                          const rows: React.ReactNode[] = [];
                          for (let row = 0; row < 6; row++) {
                            const rowCells: React.ReactNode[] = [];
                            for (let col = 0; col < 7; col++) {
                              const cellIndex = row * 7 + col;
                              const dayNumber = cellIndex - firstDay + 1;
                              if (dayNumber < 1 || dayNumber > daysInMonth) {
                                rowCells.push(
                                  <td key={`${row}-${col}`} className="border border-slate-100 p-1" />
                                );
                              } else {
                                const key = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
                                const v = byDate[key];
                                let bg = "bg-white";
                                if (v?.present) bg = v.late ? "bg-amber-100" : "bg-emerald-100";
                                else if (v?.leave) bg = "bg-slate-200";
                                rowCells.push(
                                  <td
                                    key={key}
                                    className={`border border-slate-200 p-1 text-center text-sm ${bg}`}
                                    title={v ? `Present: ${v.present}, Leave: ${v.leave}` : ""}
                                  >
                                    {dayNumber}
                                  </td>
                                );
                              }
                            }
                            rows.push(<tr key={row}>{rowCells}</tr>);
                          }
                          return rows;
                        })()}
                      </tbody>
                    </table>
                    <p className="mt-2 text-xs text-slate-500">
                      Green: Present · Amber: Late · Gray: Leave
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "my" && (
          <Card>
            <CardHeader>
              <CardTitle>My Attendance</CardTitle>
              <p className="text-sm text-slate-500">
                Same table filtered by employee (select employee in future for self-service).
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </div>
              {tableLoading ? (
                <Skeleton className="mt-4 h-48 w-full" />
              ) : (
                <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                  <Table>
                    <THead>
                      <tr>
                        <TH>Date</TH>
                        <TH>Shift</TH>
                        <TH>Check-in</TH>
                        <TH>Check-out</TH>
                        <TH>Working Hours</TH>
                        <TH>Status</TH>
                        <TH>Overtime</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {rows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <TD>{formatDate(row.attendanceDate)}</TD>
                          <TD>{row.shift?.name ?? "—"}</TD>
                          <TD>{formatTime(row.checkInAt)}</TD>
                          <TD>{formatTime(row.checkOutAt)}</TD>
                          <TD>{formatHoursMinutes(row.workingHoursMinutes)}</TD>
                          <TD>
                            <Badge variant={statusBadge[row.derivedStatus] ?? "outline"}>
                              {row.derivedStatus}
                            </Badge>
                          </TD>
                          <TD>
                            {row.overtimeMinutes > 0
                              ? formatHoursMinutes(row.overtimeMinutes)
                              : "—"}
                          </TD>
                        </tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )}
              {rows.length === 0 && !tableLoading && (
                <EmptyState
                  icon={Clock}
                  title="No records"
                  description="No attendance records for the selected period."
                />
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "regularization" && (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>Regularization Requests</CardTitle>
                <p className="text-sm text-slate-500">
                  Employees can submit missing punch correction, late arrival reason, or early exit
                  reason. Manager can approve or reject. All changes are audit logged.
                </p>
              </div>
              <Button onClick={() => setRegularizationModalOpen(true)}>
                <Plus size={14} /> Request correction
              </Button>
            </CardHeader>
            <CardContent>
              {regularizationRequests.length === 0 ? (
                <>
                  <EmptyState
                    icon={FileText}
                    title="No regularization requests"
                    description="When employees submit attendance correction requests, they will appear here. You can approve or reject with audit trail."
                  />
                </>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <Table>
                    <THead>
                      <tr>
                        <TH>Employee</TH>
                        <TH>Date</TH>
                        <TH>Type</TH>
                        <TH>Reason</TH>
                        <TH>Status</TH>
                        <TH>Submitted</TH>
                        <TH>Actions</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {regularizationRequests.map((req) => (
                        <tr key={req.id} className="border-t border-slate-100">
                          <TD>
                            <div>
                              <p className="font-medium">{req.employeeName}</p>
                              <p className="text-xs text-slate-500">{req.employeeCode}</p>
                            </div>
                          </TD>
                          <TD className="whitespace-nowrap">{formatDate(req.date)}</TD>
                          <TD>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                              {req.type === "MISSING_PUNCH"
                                ? "Missing punch"
                                : req.type === "LATE_REASON"
                                  ? "Late arrival"
                                  : "Early exit"}
                            </span>
                          </TD>
                          <TD className="max-w-[200px] truncate text-sm" title={req.reason}>
                            {req.reason}
                          </TD>
                          <TD>
                            <Badge
                              variant={
                                req.status === "APPROVED"
                                  ? "success"
                                  : req.status === "REJECTED"
                                    ? "danger"
                                    : "warning"
                              }
                            >
                              {req.status}
                            </Badge>
                          </TD>
                          <TD className="whitespace-nowrap text-xs text-slate-500">
                            {formatDate(req.submittedAt)} {new Date(req.submittedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </TD>
                          <TD>
                            {req.status === "PENDING" && (
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                  onClick={() => {
                                    setRegularizationRequests((prev) =>
                                      prev.map((r) =>
                                        r.id === req.id ? { ...r, status: "APPROVED" as const } : r
                                      )
                                    );
                                    setToast("Request approved.");
                                  }}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                  onClick={() => {
                                    setRegularizationRequests((prev) =>
                                      prev.map((r) =>
                                        r.id === req.id ? { ...r, status: "REJECTED" as const } : r
                                      )
                                    );
                                    setToast("Request rejected.");
                                  }}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </TD>
                        </tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "overtime" && (
          <Card>
            <CardHeader>
              <CardTitle>Overtime</CardTitle>
              <p className="text-sm text-slate-500">
                Overtime is calculated automatically based on shift rules (min working hours,
                overtime threshold). Feeds into payroll.
              </p>
            </CardHeader>
            <CardContent>
              {tableLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : overtimeRows.length === 0 ? (
                <EmptyState
                  icon={Timer}
                  title="No overtime records"
                  description="Overtime will appear here when employees work beyond their shift hours (shift must be overtime-eligible)."
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <Table>
                    <THead>
                      <tr>
                        <TH>Employee</TH>
                        <TH>Date</TH>
                        <TH>Working Hours</TH>
                        <TH>Overtime</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {overtimeRows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <TD>
                            <div>
                              <p className="font-medium">{row.employee?.fullName ?? "—"}</p>
                              <p className="text-xs text-slate-500">{row.employee?.employeeCode ?? "—"}</p>
                            </div>
                          </TD>
                          <TD>{formatDate(row.attendanceDate)}</TD>
                          <TD>{formatHoursMinutes(row.workingHoursMinutes)}</TD>
                          <TD className="font-medium">
                            {formatHoursMinutes(row.overtimeMinutes)}
                          </TD>
                        </tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "reports" && (
          <Card>
            <CardHeader>
              <CardTitle>Attendance Reports</CardTitle>
              <p className="text-sm text-slate-500">
                Monthly attendance, late coming, overtime, absenteeism, department-wise. Export to
                CSV, Excel, or PDF.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  "Monthly attendance report",
                  "Late coming report",
                  "Overtime report",
                  "Absenteeism report",
                  "Department attendance report"
                ].map((label) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
                  >
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setToast(`${label} – CSV export (wire to API)`)}
                      >
                        <Download size={14} /> CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setToast(`${label} – Excel export (wire to API)`)}
                      >
                        <Download size={14} /> Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setToast(`${label} – PDF export (wire to API)`)}
                      >
                        <Download size={14} /> PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* View details modal */}
      <Modal
        open={!!detailsModalRecord}
        onClose={() => setDetailsModalRecord(null)}
        title="Attendance details"
      >
        {detailsModalRecord && (
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-medium text-slate-500">Employee:</span>{" "}
              {detailsModalRecord.employee?.fullName} ({detailsModalRecord.employee?.employeeCode})
            </p>
            <p>
              <span className="font-medium text-slate-500">Date:</span>{" "}
              {formatDate(detailsModalRecord.attendanceDate)}
            </p>
            <p>
              <span className="font-medium text-slate-500">Shift:</span>{" "}
              {detailsModalRecord.shift?.name ?? "—"}
            </p>
            <p>
              <span className="font-medium text-slate-500">Check-in:</span>{" "}
              {formatTime(detailsModalRecord.checkInAt)}
            </p>
            <p>
              <span className="font-medium text-slate-500">Check-out:</span>{" "}
              {formatTime(detailsModalRecord.checkOutAt)}
            </p>
            <p>
              <span className="font-medium text-slate-500">Working hours:</span>{" "}
              {formatHoursMinutes(detailsModalRecord.workingHoursMinutes)}
            </p>
            <p>
              <span className="font-medium text-slate-500">Status:</span>{" "}
              <Badge variant={statusBadge[detailsModalRecord.derivedStatus] ?? "outline"}>
                {detailsModalRecord.derivedStatus}
              </Badge>
            </p>
            {detailsModalRecord.overtimeMinutes > 0 && (
              <p>
                <span className="font-medium text-slate-500">Overtime:</span>{" "}
                {formatHoursMinutes(detailsModalRecord.overtimeMinutes)}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Correct attendance modal – placeholder */}
      <Modal
        open={!!correctModalRecord}
        onClose={() => setCorrectModalRecord(null)}
        title="Correct attendance"
      >
        {correctModalRecord && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Correct check-in/check-out for {correctModalRecord.employee?.fullName} on{" "}
              {formatDate(correctModalRecord.attendanceDate)}. Changes will be audit logged.
            </p>
            <FormField label="Check-in (new)" required>
              <Input
                type="datetime-local"
                defaultValue={
                  correctModalRecord.checkInAt
                    ? new Date(correctModalRecord.checkInAt).toISOString().slice(0, 16)
                    : ""
                }
              />
            </FormField>
            <FormField label="Check-out (new)">
              <Input
                type="datetime-local"
                defaultValue={
                  correctModalRecord.checkOutAt
                    ? new Date(correctModalRecord.checkOutAt).toISOString().slice(0, 16)
                    : ""
                }
              />
            </FormField>
            <FormField label="Reason">
              <Textarea placeholder="Reason for correction (audit log)" />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCorrectModalRecord(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setToast("Correction API can be wired to PATCH /api/v1/attendance/:id");
                  setCorrectModalRecord(null);
                }}
              >
                Save correction
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Manual entry modal – placeholder */}
      <Modal open={manualEntryOpen} onClose={() => setManualEntryOpen(false)} title="Add manual entry">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Mark attendance for an employee (e.g. missing punch). Uses existing mark/check-in APIs.
          </p>
          <FormField label="Employee" required>
            <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={employeePopoverOpen}
                  className="w-full justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 hover:bg-slate-50"
                >
                  {manualEmployeeId
                    ? employees.find((e) => e.id === manualEmployeeId)?.fullName +
                      " (" +
                      (employees.find((e) => e.id === manualEmployeeId)?.employeeCode ?? "") +
                      ")"
                    : "Select employee..."}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="min-w-[280px] w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search by name or code..." />
                  <CommandList>
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup heading="Employees">
                      {employees.map((emp) => (
                        <CommandItem
                          key={emp.id}
                          value={`${emp.fullName} ${emp.employeeCode}`}
                          onSelect={() => {
                            setManualEmployeeId(emp.id);
                            setEmployeePopoverOpen(false);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            setManualEmployeeId(emp.id);
                            setEmployeePopoverOpen(false);
                          }}
                        >
                          <div className="flex flex-col pointer-events-none">
                            <span className="font-medium">{emp.fullName}</span>
                            <span className="text-xs text-slate-500">{emp.employeeCode}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FormField>
          <FormField label="Date" required>
            <Input
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
            />
          </FormField>
          <FormField label="Status" required>
            <Select
              value={manualStatus}
              onValueChange={(v) => setManualStatus(v as "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE")}
            >
              <SelectTrigger className="w-full rounded-lg border border-slate-200">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRESENT">Present</SelectItem>
                <SelectItem value="ABSENT">Absent</SelectItem>
                <SelectItem value="HALF_DAY">Half Day</SelectItem>
                <SelectItem value="ON_LEAVE">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setManualEntryOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!manualEmployeeId || !manualDate) {
                  setToast("Select employee and date.");
                  return;
                }
                try {
                  const res = await fetch("/api/v1/attendance", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      orgId: ORG_ID,
                      actorRole: ACTOR_ROLE,
                      actorUserId: ACTOR_USER_ID,
                      employeeId: manualEmployeeId,
                      attendanceDate: new Date(manualDate).toISOString(),
                      status: manualStatus
                    })
                  });
                  if (res.ok) {
                    setToast("Attendance marked successfully.");
                    setManualEntryOpen(false);
                    setManualEmployeeId("");
                    setManualDate(new Date().toISOString().slice(0, 10));
                    setManualStatus("PRESENT");
                    setEmployeePopoverOpen(false);
                    void loadTable();
                    void loadSummary();
                  } else {
                    setToast(await res.text());
                  }
                } catch {
                  setToast("Failed to save.");
                }
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Regularization request modal */}
      <Modal
        open={regularizationModalOpen}
        onClose={() => {
          setRegularizationModalOpen(false);
          setRegEmployeeId("");
          setRegDate(new Date().toISOString().slice(0, 10));
          setRegType("MISSING_PUNCH");
          setRegReason("");
          setRegEmployeePopoverOpen(false);
        }}
        title="Request attendance correction"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Submit a request to correct missing punch, late arrival, or early exit. Your manager will
            review and approve or reject.
          </p>
          <FormField label="Employee" required>
            <Popover open={regEmployeePopoverOpen} onOpenChange={setRegEmployeePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={regEmployeePopoverOpen}
                  className="w-full justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 hover:bg-slate-50"
                >
                  {regEmployeeId
                    ? employees.find((e) => e.id === regEmployeeId)?.fullName +
                      " (" +
                      (employees.find((e) => e.id === regEmployeeId)?.employeeCode ?? "") +
                      ")"
                    : "Select employee..."}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="min-w-[280px] w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search by name or code..." />
                  <CommandList>
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup heading="Employees">
                      {employees.map((emp) => (
                        <CommandItem
                          key={emp.id}
                          value={`${emp.fullName} ${emp.employeeCode}`}
                          onSelect={() => {
                            setRegEmployeeId(emp.id);
                            setRegEmployeePopoverOpen(false);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            setRegEmployeeId(emp.id);
                            setRegEmployeePopoverOpen(false);
                          }}
                        >
                          <div className="flex flex-col pointer-events-none">
                            <span className="font-medium">{emp.fullName}</span>
                            <span className="text-xs text-slate-500">{emp.employeeCode}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FormField>
          <FormField label="Date" required>
            <Input type="date" value={regDate} onChange={(e) => setRegDate(e.target.value)} />
          </FormField>
          <FormField label="Correction type" required>
            <Select value={regType} onValueChange={(v) => setRegType(v as "MISSING_PUNCH" | "LATE_REASON" | "EARLY_EXIT")}>
              <SelectTrigger className="w-full rounded-lg border border-slate-200">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MISSING_PUNCH">Missing punch</SelectItem>
                <SelectItem value="LATE_REASON">Late arrival reason</SelectItem>
                <SelectItem value="EARLY_EXIT">Early exit reason</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Reason" required>
            <Textarea
              placeholder="Explain why the correction is needed..."
              value={regReason}
              onChange={(e) => setRegReason(e.target.value)}
              rows={3}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRegularizationModalOpen(false);
                setRegEmployeeId("");
                setRegDate(new Date().toISOString().slice(0, 10));
                setRegType("MISSING_PUNCH");
                setRegReason("");
                setRegEmployeePopoverOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!regEmployeeId || !regReason.trim()) {
                  setToast("Please select employee and enter a reason.");
                  return;
                }
                const employee = employees.find((e) => e.id === regEmployeeId);
                const newRequest: RegularizationRequest = {
                  id: `reg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                  employeeId: regEmployeeId,
                  employeeName: employee?.fullName ?? "—",
                  employeeCode: employee?.employeeCode ?? "—",
                  date: regDate,
                  type: regType,
                  reason: regReason.trim(),
                  status: "PENDING",
                  submittedAt: new Date().toISOString()
                };
                setRegularizationRequests((prev) => [newRequest, ...prev]);
                setToast("Correction request submitted.");
                setRegularizationModalOpen(false);
                setRegEmployeeId("");
                setRegDate(new Date().toISOString().slice(0, 10));
                setRegType("MISSING_PUNCH");
                setRegReason("");
                setRegEmployeePopoverOpen(false);
              }}
            >
              Submit request
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
