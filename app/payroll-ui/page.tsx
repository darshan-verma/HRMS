"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet, RefreshCw, Calculator, DollarSign, FileText, TrendingUp, Inbox, AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

type PayrollRun = {
  id: string;
  period: string;
  status: string;
  startedAt: string;
  completedAt?: string | null;
};

type SalaryStructure = {
  id: string;
  employeeId: string;
  basic: string;
  hra: string;
  specialAllowance: string;
  effectiveFrom: string;
};

const runStatusBadge: Record<string, "success" | "danger" | "warning" | "info"> = {
  COMPLETED: "success",
  FAILED: "danger",
  PROCESSING: "warning",
  PENDING: "info"
};

export default function PayrollUiPage() {
  const [response, setResponse] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"runs" | "structures">("runs");

  const query = useMemo(
    () => new URLSearchParams({ orgId: "seed-org", actorRole: "HR_ADMIN" }).toString(),
    []
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const [runsRes, structRes] = await Promise.all([
      fetch(`/api/v1/payroll/runs?${query}`, { cache: "no-store" }),
      fetch(`/api/v1/payroll/salary-structures?${query}`, { cache: "no-store" })
    ]);
    if (runsRes.ok) setRuns((await runsRes.json()) as PayrollRun[]);
    if (structRes.ok) setStructures((await structRes.json()) as SalaryStructure[]);
    if (!runsRes.ok || !structRes.ok) setError("Failed to load payroll resources.");
    else setError(null);
    setLoading(false);
  }, [query]);

  async function calculateTax() {
    const res = await fetch("/api/v1/payroll/calculate-tax", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        actorRole: "HR_ADMIN",
        annualTaxableIncome: "1250000",
        regime: "NEW"
      })
    });
    setResponse(await res.text());
  }

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const tabs = [
    { key: "runs" as const, label: "Payroll Runs", count: runs.length },
    { key: "structures" as const, label: "Salary Structures", count: structures.length }
  ];

  return (
    <DashboardLayout title="Payroll" subtitle="Manage salary structures, tax calculations, and payroll runs">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Payroll Runs"
          value={loading ? "--" : `${runs.length}`}
          icon={Wallet}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <StatCard
          label="Salary Structures"
          value={loading ? "--" : `${structures.length}`}
          icon={FileText}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
        <StatCard
          label="Total Basic"
          value={loading ? "--" : `₹${structures.reduce((sum, s) => sum + Number(s.basic), 0).toLocaleString()}`}
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Completed Runs"
          value={loading ? "--" : `${runs.filter((r) => r.status === "COMPLETED").length}`}
          icon={TrendingUp}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-2">
        <Button size="sm" onClick={calculateTax}>
          <Calculator size={14} /> Calculate Tax (Sample)
        </Button>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}
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

      {/* Content */}
      <Card className="mt-4">
        <CardContent className="pt-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : activeTab === "runs" ? (
            runs.length === 0 ? (
              <EmptyState icon={Inbox} title="No payroll runs" description="No payroll runs have been executed yet." />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Period</TH>
                      <TH>Status</TH>
                      <TH>Started At</TH>
                      <TH>Completed At</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {runs.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                        <TD className="font-medium">{r.period}</TD>
                        <TD>
                          <Badge variant={runStatusBadge[r.status] ?? "outline"}>{r.status}</Badge>
                        </TD>
                        <TD>{new Date(r.startedAt).toLocaleString()}</TD>
                        <TD>{r.completedAt ? new Date(r.completedAt).toLocaleString() : "-"}</TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )
          ) : structures.length === 0 ? (
            <EmptyState icon={Inbox} title="No salary structures" description="No salary structures have been defined." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <Table>
                <THead>
                  <tr>
                    <TH>Employee ID</TH>
                    <TH>Basic</TH>
                    <TH>HRA</TH>
                    <TH>Special Allowance</TH>
                    <TH>Effective From</TH>
                  </tr>
                </THead>
                <TBody>
                  {structures.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                      <TD>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">
                          {s.employeeId}
                        </span>
                      </TD>
                      <TD className="font-semibold text-slate-900">₹{Number(s.basic).toLocaleString()}</TD>
                      <TD>₹{Number(s.hra).toLocaleString()}</TD>
                      <TD>₹{Number(s.specialAllowance).toLocaleString()}</TD>
                      <TD>{new Date(s.effectiveFrom).toLocaleDateString()}</TD>
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
