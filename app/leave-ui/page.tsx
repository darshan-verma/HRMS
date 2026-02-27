"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarOff, RefreshCw, PlayCircle, FileText, CheckCircle2, Clock, Inbox } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

type LeavePolicy = {
  id: string;
  leaveType: string;
  annualQuota: number;
  accrualPerMonth: string;
};

type LeaveRequest = {
  id: string;
  status: string;
  daysRequested: string;
  employee: { fullName: string; employeeCode: string };
  leavePolicy: { leaveType: string };
};

type LeaveBalance = {
  id: string;
  availableDays: string;
  employee: { fullName: string; employeeCode: string };
  leavePolicy: { leaveType: string };
};

const requestStatusBadge: Record<string, "success" | "danger" | "warning" | "info"> = {
  APPROVED: "success",
  REJECTED: "danger",
  PENDING: "warning",
  CANCELLED: "info"
};

export default function LeaveUiPage() {
  const [response, setResponse] = useState<string>("");
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"requests" | "policies" | "balances">("requests");

  const query = useMemo(
    () => new URLSearchParams({ orgId: "seed-org", actorRole: "HR_ADMIN" }).toString(),
    []
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const [policyRes, requestRes, balanceRes] = await Promise.all([
      fetch(`/api/v1/leave/policies?${query}`, { cache: "no-store" }),
      fetch(`/api/v1/leave?${query}`, { cache: "no-store" }),
      fetch(`/api/v1/leave/balances?${query}`, { cache: "no-store" })
    ]);

    if (policyRes.ok) setPolicies((await policyRes.json()) as LeavePolicy[]);
    if (requestRes.ok) setRequests((await requestRes.json()) as LeaveRequest[]);
    if (balanceRes.ok) setBalances((await balanceRes.json()) as LeaveBalance[]);
    if (!policyRes.ok || !requestRes.ok || !balanceRes.ok) {
      setResponse("Failed to load one or more leave resources.");
    }
    setLoading(false);
  }, [query]);

  async function runAccrual() {
    const res = await fetch("/api/v1/leave/accrual/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: "seed-org", actorRole: "HR_ADMIN" })
    });
    setResponse(await res.text());
    await loadData();
  }

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const tabs = [
    { key: "requests" as const, label: "Leave Requests", count: requests.length },
    { key: "policies" as const, label: "Policies", count: policies.length },
    { key: "balances" as const, label: "Balances", count: balances.length }
  ];

  return (
    <DashboardLayout title="Leave Management" subtitle="Manage leave policies, requests, and employee balances">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Policies"
          value={loading ? "--" : `${policies.length}`}
          icon={FileText}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <StatCard
          label="Pending Requests"
          value={loading ? "--" : `${requests.filter((r) => r.status === "PENDING").length}`}
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Approved"
          value={loading ? "--" : `${requests.filter((r) => r.status === "APPROVED").length}`}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Total Requests"
          value={loading ? "--" : `${requests.length}`}
          icon={CalendarOff}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-2">
        <Button size="sm" onClick={runAccrual}>
          <PlayCircle size={14} /> Run Monthly Accrual
        </Button>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {response && (
        <pre className="mt-4 overflow-auto rounded-lg border border-slate-200 bg-slate-900 p-4 text-xs text-slate-100">
          {response}
        </pre>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              activeTab === tab.key ? "bg-brand-50 text-brand-700" : "bg-slate-200 text-slate-500"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <Card className="mt-4">
        <CardContent className="pt-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : activeTab === "requests" ? (
            requests.length === 0 ? (
              <EmptyState icon={Inbox} title="No leave requests" description="No leave requests have been submitted yet." />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Employee</TH>
                      <TH>Leave Type</TH>
                      <TH>Days</TH>
                      <TH>Status</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {requests.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                        <TD>
                          <div>
                            <p className="font-medium text-slate-900">{r.employee.fullName}</p>
                            <p className="text-xs text-slate-400">{r.employee.employeeCode}</p>
                          </div>
                        </TD>
                        <TD>{r.leavePolicy.leaveType}</TD>
                        <TD className="font-semibold">{r.daysRequested}</TD>
                        <TD>
                          <Badge variant={requestStatusBadge[r.status] ?? "outline"}>{r.status}</Badge>
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )
          ) : activeTab === "policies" ? (
            policies.length === 0 ? (
              <EmptyState icon={Inbox} title="No policies" description="No leave policies have been created yet." />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Leave Type</TH>
                      <TH>Annual Quota</TH>
                      <TH>Accrual / Month</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {policies.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                        <TD className="font-medium">{p.leaveType}</TD>
                        <TD>{p.annualQuota} days</TD>
                        <TD>{p.accrualPerMonth} days</TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )
          ) : balances.length === 0 ? (
            <EmptyState icon={Inbox} title="No balances" description="No leave balances available." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <Table>
                <THead>
                  <tr>
                    <TH>Employee</TH>
                    <TH>Leave Type</TH>
                    <TH>Available Days</TH>
                  </tr>
                </THead>
                <TBody>
                  {balances.map((b) => (
                    <tr key={b.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
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
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
