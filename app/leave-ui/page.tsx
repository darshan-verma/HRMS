"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarOff,
  RefreshCw,
  PlayCircle,
  FileText,
  CheckCircle2,
  Clock,
  Inbox,
  Plus,
  Calendar as CalendarIcon,
  BarChart3,
  Users,
  XCircle,
  AlertCircle,
  Search
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal, FormField, Input, Textarea } from "@/components/ui/modal";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction
} from "@/components/ui/alert-dialog";

const ORG_ID = "seed-org";
const ACTOR_ROLE = "HR_ADMIN";
const ACTOR_USER_ID = "seed-user";

type LeavePolicy = {
  id: string;
  leaveType: string;
  annualQuota: number;
  accrualPerMonth: string;
  carryForward?: boolean;
  leaveCycle?: string;
  sandwichRuleCountWeekends?: boolean;
  accrualType?: string;
};

type LeaveRequest = {
  id: string;
  status: string;
  daysRequested: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  employee: { id: string; fullName: string; employeeCode: string };
  leavePolicy: { id: string; leaveType: string };
};

type LeaveBalance = {
  id: string;
  availableDays: string;
  usedDays?: string;
  carriedForward?: string;
  employee: { fullName: string; employeeCode: string };
  leavePolicy: { leaveType: string };
};

type LeaveStats = {
  pendingRequests: number;
  employeesOnLeaveToday: number;
  leaveAppliedThisMonth: number;
  averageLeaveUsage: string;
};

type CalendarEvent = {
  id: string;
  startDate: string;
  endDate: string;
  employee: { fullName: string; employeeCode: string };
  leavePolicy: { leaveType: string };
};

type Analytics = {
  totalRequests: number;
  totalDays: number;
  byDepartment: { departmentId: string | null; count: number; days: number }[];
  byLeaveType: { leaveType: string; count: number; days: number }[];
};

type EmployeeOption = { id: string; fullName: string; employeeCode: string };

const requestStatusBadge: Record<string, "success" | "danger" | "warning" | "info"> = {
  APPROVED: "success",
  REJECTED: "danger",
  PENDING: "warning",
  CANCELLED: "info",
  WITHDRAWN: "info"
};

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export default function LeaveManagementPage() {
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [stats, setStats] = useState<LeaveStats | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "requests" | "balance" | "policies" | "calendar" | "reports"
  >("requests");
  const [toast, setToast] = useState<string | null>(null);

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [createPolicyOpen, setCreatePolicyOpen] = useState(false);
  const [rejectDialogRequestId, setRejectDialogRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formPolicyId, setFormPolicyId] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formReason, setFormReason] = useState("");

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [leaveTypeSearch, setLeaveTypeSearch] = useState("");
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [leaveTypeDropdownOpen, setLeaveTypeDropdownOpen] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [policiesLoadingForModal, setPoliciesLoadingForModal] = useState(false);

  const [policyFormLeaveType, setPolicyFormLeaveType] = useState("");
  const [policyFormAnnualQuota, setPolicyFormAnnualQuota] = useState("");
  const [policyFormAccrualPerMonth, setPolicyFormAccrualPerMonth] = useState("");
  const [policyFormCarryForward, setPolicyFormCarryForward] = useState(false);

  const [calendarFrom, setCalendarFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [calendarTo, setCalendarTo] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().slice(0, 10);
  });

  const query = useMemo(
    () => new URLSearchParams({ orgId: ORG_ID, actorRole: ACTOR_ROLE }).toString(),
    []
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [policyRes, requestRes, balanceRes, statsRes] = await Promise.all([
        fetch(`/api/v1/leave/policies?${query}`, { cache: "no-store" }),
        fetch(`/api/v1/leave?${query}`, { cache: "no-store" }),
        fetch(`/api/v1/leave/balances?${query}`, { cache: "no-store" }),
        fetch(`/api/v1/leave/stats?${query}`, { cache: "no-store" })
      ]);
      if (policyRes.ok) setPolicies((await policyRes.json()) as LeavePolicy[]);
      if (requestRes.ok) setRequests((await requestRes.json()) as LeaveRequest[]);
      if (balanceRes.ok) setBalances((await balanceRes.json()) as LeaveBalance[]);
      if (statsRes.ok) setStats((await statsRes.json()) as LeaveStats);
    } catch {
      setToast("Failed to load data.");
    }
    setLoading(false);
  }, [query]);

  const loadCalendar = useCallback(async () => {
    const q = `${query}&from=${calendarFrom}&to=${calendarTo}`;
    const res = await fetch(`/api/v1/leave/calendar?${q}`, { cache: "no-store" });
    if (res.ok) setCalendarEvents((await res.json()) as CalendarEvent[]);
  }, [query, calendarFrom, calendarTo]);

  const loadAnalytics = useCallback(async () => {
    const res = await fetch(`/api/v1/leave/analytics?${query}`, { cache: "no-store" });
    if (res.ok) setAnalytics((await res.json()) as Analytics);
  }, [query]);

  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const res = await fetch(`/api/v1/employees?${query}&page=1&pageSize=100`, {
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.items ?? data.employees ?? data ?? []);
      } else {
        setToast("Failed to load employees. You may need EMPLOYEE_READ permission.");
      }
    } catch {
      setToast("Failed to load employees.");
    } finally {
      setEmployeesLoading(false);
    }
  }, [query]);

  const loadPoliciesForModal = useCallback(async () => {
    setPoliciesLoadingForModal(true);
    try {
      const res = await fetch(`/api/v1/leave/policies?${query}`, { cache: "no-store" });
      if (res.ok) setPolicies((await res.json()) as LeavePolicy[]);
      else setToast("Failed to load leave policies.");
    } catch {
      setToast("Failed to load leave policies.");
    } finally {
      setPoliciesLoadingForModal(false);
    }
  }, [query]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const q = employeeSearch.trim().toLowerCase();
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        (e.employeeCode && e.employeeCode.toLowerCase().includes(q))
    );
  }, [employees, employeeSearch]);

  const filteredPolicies = useMemo(() => {
    if (!leaveTypeSearch.trim()) return policies;
    const q = leaveTypeSearch.trim().toLowerCase();
    return policies.filter((p) => p.leaveType.toLowerCase().includes(q));
  }, [policies, leaveTypeSearch]);

  const selectedEmployeeLabel = useMemo(
    () => employees.find((e) => e.id === formEmployeeId)?.fullName ?? "",
    [employees, formEmployeeId]
  );
  const selectedLeaveTypeLabel = useMemo(
    () => policies.find((p) => p.id === formPolicyId)?.leaveType ?? "",
    [policies, formPolicyId]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === "calendar") void loadCalendar();
  }, [activeTab, loadCalendar]);

  useEffect(() => {
    if (activeTab === "reports") void loadAnalytics();
  }, [activeTab, loadAnalytics]);

  useEffect(() => {
    if (applyModalOpen) {
      loadEmployees();
      loadPoliciesForModal();
    }
  }, [applyModalOpen, loadEmployees, loadPoliciesForModal]);

  async function runAccrual() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/leave/accrual/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: ORG_ID, actorRole: ACTOR_ROLE, actorUserId: ACTOR_USER_ID })
      });
      const text = await res.text();
      if (res.ok) {
        setToast("Accrual run completed.");
        await loadData();
      } else setToast(text || "Accrual failed.");
    } catch {
      setToast("Accrual request failed.");
    }
    setSubmitting(false);
  }

  async function submitLeaveRequest() {
    if (!formEmployeeId || !formPolicyId || !formStartDate || !formEndDate) {
      setToast("Please fill employee, leave type, start and end date.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: ACTOR_ROLE,
          actorUserId: ACTOR_USER_ID,
          employeeId: formEmployeeId,
          leavePolicyId: formPolicyId,
          startDate: formStartDate,
          endDate: formEndDate,
          reason: formReason || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setApplyModalOpen(false);
        setFormEmployeeId("");
        setFormPolicyId("");
        setFormStartDate("");
        setFormEndDate("");
        setFormReason("");
        setToast("Leave request submitted.");
        await loadData();
      } else setToast(data?.error?.message || data?.error || "Submit failed.");
    } catch {
      setToast("Request failed.");
    }
    setSubmitting(false);
  }

  async function createPolicy() {
    if (!policyFormLeaveType || !policyFormAnnualQuota || !policyFormAccrualPerMonth) {
      setToast("Fill leave type, annual quota and accrual per month.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/leave/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: ACTOR_ROLE,
          actorUserId: ACTOR_USER_ID,
          leaveType: policyFormLeaveType,
          annualQuota: Number(policyFormAnnualQuota),
          accrualPerMonth: policyFormAccrualPerMonth,
          carryForward: policyFormCarryForward
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCreatePolicyOpen(false);
        setPolicyFormLeaveType("");
        setPolicyFormAnnualQuota("");
        setPolicyFormAccrualPerMonth("");
        setPolicyFormCarryForward(false);
        setToast("Policy created.");
        await loadData();
      } else setToast(data?.error?.message || data?.error || "Create failed.");
    } catch {
      setToast("Create failed.");
    }
    setSubmitting(false);
  }

  async function approveRequest(id: string) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/leave/requests/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: ACTOR_ROLE,
          actorUserId: ACTOR_USER_ID,
          leaveRequestId: id,
          decision: "APPROVED"
        })
      });
      if (res.ok) {
        setToast("Leave approved.");
        await loadData();
      } else {
        const data = await res.json();
        setToast(data?.error?.message || data?.error || "Approve failed.");
      }
    } catch {
      setToast("Approve failed.");
    }
    setSubmitting(false);
  }

  async function rejectRequest(id: string, reason: string) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/leave/requests/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: ACTOR_ROLE,
          actorUserId: ACTOR_USER_ID,
          leaveRequestId: id,
          decision: "REJECTED",
          rejectionReason: reason || "No reason provided"
        })
      });
      if (res.ok) {
        setRejectDialogRequestId(null);
        setRejectReason("");
        setToast("Leave rejected.");
        await loadData();
      } else {
        const data = await res.json();
        setToast(data?.error?.message || data?.error || "Reject failed.");
      }
    } catch {
      setToast("Reject failed.");
    }
    setSubmitting(false);
  }

  async function cancelRequest(id: string) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/leave/requests/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: ACTOR_ROLE,
          actorUserId: ACTOR_USER_ID,
          leaveRequestId: id
        })
      });
      if (res.ok) {
        setToast("Leave cancelled.");
        await loadData();
      } else setToast("Cancel failed.");
    } catch {
      setToast("Cancel failed.");
    }
    setSubmitting(false);
  }

  async function withdrawRequest(id: string) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/leave/requests/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: ACTOR_ROLE,
          actorUserId: ACTOR_USER_ID,
          leaveRequestId: id
        })
      });
      if (res.ok) {
        setToast("Leave withdrawn.");
        await loadData();
      } else setToast("Withdraw failed.");
    } catch {
      setToast("Withdraw failed.");
    }
    setSubmitting(false);
  }

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const tabs = [
    { key: "requests" as const, label: "Leave Requests", count: requests.length },
    { key: "balance" as const, label: "Leave Balance", count: balances.length },
    { key: "policies" as const, label: "Leave Policies", count: policies.length },
    { key: "calendar" as const, label: "Leave Calendar" },
    { key: "reports" as const, label: "Leave Reports" }
  ];

  return (
    <DashboardLayout
      title="Leave Management"
      subtitle="Policies, requests, balances, calendar and reports"
    >
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending Requests"
          value={loading ? "--" : String(stats?.pendingRequests ?? pendingCount)}
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          label="On Leave Today"
          value={loading ? "--" : String(stats?.employeesOnLeaveToday ?? 0)}
          icon={Users}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
        <StatCard
          label="Applied This Month"
          value={loading ? "--" : String(stats?.leaveAppliedThisMonth ?? 0)}
          icon={CalendarOff}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <StatCard
          label="Avg Leave Usage"
          value={loading ? "--" : `${stats?.averageLeaveUsage ?? 0} days`}
          icon={BarChart3}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setApplyModalOpen(true)}>
          <Plus size={14} /> Apply Leave
        </Button>
        <Button size="sm" variant="outline" onClick={() => setCreatePolicyOpen(true)}>
          <FileText size={14} /> New Policy
        </Button>
        <Button size="sm" variant="outline" onClick={runAccrual} disabled={submitting}>
          <PlayCircle size={14} /> Run Accrual
        </Button>
        <Button size="sm" variant="outline" onClick={loadData}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {toast && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <AlertCircle size={16} />
          {toast}
          <button
            type="button"
            className="ml-auto text-amber-600 hover:text-amber-800"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
          >
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {"count" in tab && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  activeTab === tab.key ? "bg-brand-50 text-brand-700" : "bg-slate-200 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <Card className="mt-4">
        <CardContent className="pt-5">
          {loading && activeTab !== "calendar" && activeTab !== "reports" ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : activeTab === "requests" ? (
            requests.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No leave requests"
                description="Apply leave or wait for employees to submit requests."
              />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Employee</TH>
                      <TH>Leave Type</TH>
                      <TH>Dates</TH>
                      <TH>Days</TH>
                      <TH>Status</TH>
                      <TH>Actions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {requests.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-slate-100 transition-colors hover:bg-slate-50/50"
                      >
                        <TD>
                          <div>
                            <p className="font-medium text-slate-900">{r.employee.fullName}</p>
                            <p className="text-xs text-slate-400">{r.employee.employeeCode}</p>
                          </div>
                        </TD>
                        <TD>{r.leavePolicy.leaveType}</TD>
                        <TD className="text-sm">
                          {formatDate(r.startDate)} – {formatDate(r.endDate)}
                        </TD>
                        <TD className="font-semibold">{r.daysRequested}</TD>
                        <TD>
                          <Badge variant={requestStatusBadge[r.status] ?? "outline"}>
                            {r.status}
                          </Badge>
                        </TD>
                        <TD>
                          <div className="flex flex-wrap gap-1">
                            {r.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="success"
                                  className="h-7 text-xs"
                                  onClick={() => approveRequest(r.id)}
                                  disabled={submitting}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  className="h-7 text-xs"
                                  onClick={() => setRejectDialogRequestId(r.id)}
                                  disabled={submitting}
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => withdrawRequest(r.id)}
                                  disabled={submitting}
                                >
                                  Withdraw
                                </Button>
                              </>
                            )}
                            {(r.status === "PENDING" || r.status === "APPROVED") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => cancelRequest(r.id)}
                                disabled={submitting}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )
          ) : activeTab === "balance" ? (
            balances.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No balances"
                description="Run accrual or create policies and assign balances."
              />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Employee</TH>
                      <TH>Leave Type</TH>
                      <TH>Available</TH>
                      <TH>Used</TH>
                      <TH>Carried</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {balances.map((b) => (
                      <tr
                        key={b.id}
                        className="border-t border-slate-100 transition-colors hover:bg-slate-50/50"
                      >
                        <TD>
                          <div>
                            <p className="font-medium text-slate-900">{b.employee.fullName}</p>
                            <p className="text-xs text-slate-400">{b.employee.employeeCode}</p>
                          </div>
                        </TD>
                        <TD>{b.leavePolicy.leaveType}</TD>
                        <TD>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700">
                            {b.availableDays}
                          </span>
                        </TD>
                        <TD>{b.usedDays ?? "0"}</TD>
                        <TD>{b.carriedForward ?? "0"}</TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )
          ) : activeTab === "policies" ? (
            policies.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No policies"
                description="Create a leave policy to get started."
              />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Leave Type</TH>
                      <TH>Annual Quota</TH>
                      <TH>Accrual/Month</TH>
                      <TH>Carry Forward</TH>
                      <TH>Sandwich Rule</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {policies.map((p) => (
                      <tr
                        key={p.id}
                        className="border-t border-slate-100 transition-colors hover:bg-slate-50/50"
                      >
                        <TD className="font-medium">{p.leaveType}</TD>
                        <TD>{p.annualQuota} days</TD>
                        <TD>{p.accrualPerMonth} days</TD>
                        <TD>{p.carryForward ? "Yes" : "No"}</TD>
                        <TD>{p.sandwichRuleCountWeekends !== false ? "Yes" : "No"}</TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )
          ) : activeTab === "calendar" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm font-medium text-slate-700">From</label>
                <input
                  type="date"
                  value={calendarFrom}
                  onChange={(e) => setCalendarFrom(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <label className="text-sm font-medium text-slate-700">To</label>
                <input
                  type="date"
                  value={calendarTo}
                  onChange={(e) => setCalendarTo(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <Button size="sm" onClick={loadCalendar}>
                  <RefreshCw size={14} /> Load
                </Button>
              </div>
              {calendarEvents.length === 0 ? (
                <EmptyState
                  icon={CalendarIcon}
                  title="No leave in range"
                  description="Approved leave in the selected period will appear here."
                />
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <Table>
                    <THead>
                      <tr>
                        <TH>Employee</TH>
                        <TH>Leave Type</TH>
                        <TH>Start</TH>
                        <TH>End</TH>
                        <TH>Days</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {calendarEvents.map((e) => {
                        const start = new Date(e.startDate);
                        const end = new Date(e.endDate);
                        const days = Math.max(
                          1,
                          Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
                        );
                        return (
                          <tr
                            key={e.id}
                            className="border-t border-slate-100 transition-colors hover:bg-slate-50/50"
                          >
                            <TD>
                              <p className="font-medium text-slate-900">{e.employee.fullName}</p>
                              <p className="text-xs text-slate-400">{e.employee.employeeCode}</p>
                            </TD>
                            <TD>{e.leavePolicy.leaveType}</TD>
                            <TD>{formatDate(e.startDate)}</TD>
                            <TD>{formatDate(e.endDate)}</TD>
                            <TD>{days}</TD>
                          </tr>
                        );
                      })}
                    </TBody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {!analytics ? (
                <div className="flex items-center justify-center py-8">
                  <Button variant="outline" onClick={loadAnalytics}>
                    Load Reports
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Card className="border-slate-200">
                      <CardContent className="pt-4">
                        <h3 className="text-sm font-semibold text-slate-700">By Leave Type</h3>
                        <div className="mt-2 space-y-2">
                          {analytics.byLeaveType.map((x) => (
                            <div
                              key={x.leaveType}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-slate-600">{x.leaveType}</span>
                              <span className="font-medium">
                                {x.count} req · {x.days} days
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-slate-200">
                      <CardContent className="pt-4">
                        <h3 className="text-sm font-semibold text-slate-700">By Department</h3>
                        <div className="mt-2 space-y-2">
                          {analytics.byDepartment.map((x, i) => (
                            <div
                              key={x.departmentId ?? i}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-slate-600">
                                {x.departmentId ?? "Uncategorized"}
                              </span>
                              <span className="font-medium">
                                {x.count} req · {x.days} days
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <p className="text-sm text-slate-500">
                    Total: {analytics.totalRequests} requests, {analytics.totalDays} days
                  </p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apply Leave Modal */}
      <Modal
        open={applyModalOpen}
        onClose={() => {
          setApplyModalOpen(false);
          setEmployeeDropdownOpen(false);
          setLeaveTypeDropdownOpen(false);
          setEmployeeSearch("");
          setLeaveTypeSearch("");
        }}
        title="Apply Leave"
      >
        <div className="space-y-4">
          <FormField label="Employee" required>
            <div className="relative">
              <div
                className="flex min-h-[38px] w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-within:ring-2 focus-within:ring-brand-500"
                onClick={() => setEmployeeDropdownOpen((o) => !o)}
              >
                <span className={formEmployeeId ? "text-slate-900" : "text-slate-400"}>
                  {formEmployeeId ? selectedEmployeeLabel : "Select employee"}
                </span>
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
              </div>
              {employeeDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden
                    onClick={() => {
                      setEmployeeDropdownOpen(false);
                      setEmployeeSearch("");
                    }}
                  />
                  <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-100 p-2">
                      <input
                        type="text"
                        placeholder="Search by name or code..."
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                      {employeesLoading ? (
                        <div className="py-4 text-center text-sm text-slate-500">Loading...</div>
                      ) : filteredEmployees.length === 0 ? (
                        <div className="py-4 text-center text-sm text-slate-500">
                          {employees.length === 0
                            ? "No employees found. Add employees from the Employees page first."
                            : "No match for your search."}
                        </div>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            className="flex w-full flex-col rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                            onClick={() => {
                              setFormEmployeeId(emp.id);
                              setEmployeeDropdownOpen(false);
                              setEmployeeSearch("");
                            }}
                          >
                            <span className="font-medium text-slate-900">{emp.fullName}</span>
                            <span className="text-xs text-slate-500">{emp.employeeCode}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </FormField>
          <FormField label="Leave Type" required>
            <div className="relative">
              <div
                className="flex min-h-[38px] w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-within:ring-2 focus-within:ring-brand-500"
                onClick={() => setLeaveTypeDropdownOpen((o) => !o)}
              >
                <span className={formPolicyId ? "text-slate-900" : "text-slate-400"}>
                  {formPolicyId ? selectedLeaveTypeLabel : "Select leave type"}
                </span>
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
              </div>
              {leaveTypeDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden
                    onClick={() => {
                      setLeaveTypeDropdownOpen(false);
                      setLeaveTypeSearch("");
                    }}
                  />
                  <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-100 p-2">
                      <input
                        type="text"
                        placeholder="Search leave type..."
                        value={leaveTypeSearch}
                        onChange={(e) => setLeaveTypeSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                      {policiesLoadingForModal ? (
                        <div className="py-4 text-center text-sm text-slate-500">Loading...</div>
                      ) : filteredPolicies.length === 0 ? (
                        <div className="py-4 text-center text-sm text-slate-500">
                          {policies.length === 0
                            ? "No leave policies. Create a policy using the New Policy button first."
                            : "No match for your search."}
                        </div>
                      ) : (
                        filteredPolicies.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                            onClick={() => {
                              setFormPolicyId(p.id);
                              setLeaveTypeDropdownOpen(false);
                              setLeaveTypeSearch("");
                            }}
                          >
                            <span className="font-medium text-slate-900">{p.leaveType}</span>
                            <span className="text-xs text-slate-500">
                              {p.annualQuota} days/yr · {p.accrualPerMonth}/mo
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </FormField>
          <FormField label="Start Date" required>
            <Input
              type="date"
              value={formStartDate}
              onChange={(e) => setFormStartDate(e.target.value)}
            />
          </FormField>
          <FormField label="End Date" required>
            <Input
              type="date"
              value={formEndDate}
              onChange={(e) => setFormEndDate(e.target.value)}
            />
          </FormField>
          <FormField label="Reason">
            <Textarea
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="Optional"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setApplyModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitLeaveRequest} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Policy Modal */}
      <Modal open={createPolicyOpen} onClose={() => setCreatePolicyOpen(false)} title="New Leave Policy">
        <div className="space-y-4">
          <FormField label="Leave Type" required>
            <Input
              value={policyFormLeaveType}
              onChange={(e) => setPolicyFormLeaveType(e.target.value)}
              placeholder="e.g. CL, SL, PL"
            />
          </FormField>
          <FormField label="Annual Quota (days)" required>
            <Input
              type="number"
              min={0}
              value={policyFormAnnualQuota}
              onChange={(e) => setPolicyFormAnnualQuota(e.target.value)}
            />
          </FormField>
          <FormField label="Accrual per Month" required>
            <Input
              value={policyFormAccrualPerMonth}
              onChange={(e) => setPolicyFormAccrualPerMonth(e.target.value)}
              placeholder="e.g. 1.5"
            />
          </FormField>
          <FormField label="Carry Forward">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={policyFormCarryForward}
                onChange={(e) => setPolicyFormCarryForward(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-sm">Allow carry forward</span>
            </label>
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreatePolicyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createPolicy} disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject reason dialog */}
      <AlertDialog
        open={!!rejectDialogRequestId}
        onOpenChange={(open) => {
          if (!open) setRejectDialogRequestId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Leave Request</AlertDialogTitle>
            <AlertDialogDescription>
              Optionally provide a reason for rejection. The employee will see this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectDialogRequestId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() => {
                if (rejectDialogRequestId) rejectRequest(rejectDialogRequestId, rejectReason);
              }}
              disabled={submitting}
            >
              {submitting ? "Rejecting…" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
