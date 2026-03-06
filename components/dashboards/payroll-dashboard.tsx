"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, FileText, Calculator, BarChart3, Lock } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { BarChartCard, PieChartCard } from "@/components/dashboards/charts";
import { Skeleton } from "@/components/ui/skeleton";

const ORG_ID = "seed-org";

type PayrollSummary = {
  payrollRunId: string;
  period: string;
  status: string;
  totalEmployeesProcessed: number;
  grossEarnings: number;
  totalDeductions: number;
  netPayable: number;
  costToCompanyTotal: number;
};

type DetailData = {
  payroll: {
    latestRun: { id: string; period: string; status: string; startedAt: string };
    summary: PayrollSummary | null;
  } | null;
};

const quickActions = [
  { label: "Run Payroll", icon: Wallet, href: "/payroll-ui", color: "bg-amber-600" },
  { label: "Payslips", icon: FileText, href: "/payroll-ui", color: "bg-brand-600" },
  { label: "Salary Structures", icon: Calculator, href: "/payroll-ui", color: "bg-emerald-600" },
  { label: "Reports", icon: BarChart3, href: "/analytics", color: "bg-violet-600" }
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function PayrollManagerDashboard({ userName }: { userName: string }) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`/api/v1/analytics/detail?orgId=${ORG_ID}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ data: DetailData }>) : null))
      .then((json) => {
        setData(json?.data ?? null);
        setLoading(false);
      })
      .catch(() => {
        setData(null);
        setLoading(false);
      });
  }, []);

  const run = data?.payroll?.latestRun;
  const summary = data?.payroll?.summary;

  return (
    <DashboardLayout
      title="Payroll Dashboard"
      subtitle={`Welcome, ${userName}. Salary and payroll overview.`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard
              label="Current Run"
              value={run?.status ?? "Draft"}
              change={run?.period ?? "March 2026"}
              changeType="neutral"
              icon={Wallet}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
            />
            <StatCard
              label="Employees on Payroll"
              value={String(summary?.totalEmployeesProcessed ?? 0)}
              change="Active"
              changeType="positive"
              icon={FileText}
              iconColor="text-brand-600"
              iconBg="bg-brand-50"
            />
            <StatCard
              label="Payslips Generated"
              value={String(summary?.totalEmployeesProcessed ?? 0)}
              change="This run"
              changeType="neutral"
              icon={FileText}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <StatCard
              label="Net Payable"
              value={summary ? formatCurrency(Number(summary.netPayable)) : "—"}
              change="Current run"
              changeType="neutral"
              icon={Lock}
              iconColor="text-slate-600"
              iconBg="bg-slate-50"
            />
          </>
        )}
      </div>

      {!loading && summary && (
        <div className="mt-6 grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          <BarChartCard
            title="Payroll Cost Breakdown (Current Run)"
            data={[
              { name: "Gross", value: Number(summary.grossEarnings) },
              { name: "Deductions", value: Number(summary.totalDeductions) },
              { name: "Net Pay", value: Number(summary.netPayable) }
            ]}
            valueFormatter={(n) => formatCurrency(n)}
          />
          <PieChartCard
            title="Cost Distribution"
            data={[
              { name: "Gross Earnings", value: Number(summary.grossEarnings) },
              { name: "Deductions", value: Number(summary.totalDeductions) }
            ].filter((d) => d.value > 0)}
            valueFormatter={(n) => formatCurrency(n)}
            colors={["#f59e0b", "#0ea5e9"]}
          />
        </div>
      )}

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center transition-all hover:border-amber-200 hover:bg-amber-50/50"
                >
                  <div className={`rounded-lg p-2 ${action.color} text-white`}>
                    <action.icon size={18} />
                  </div>
                  <span className="text-xs font-medium text-slate-700">{action.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Payroll calendar</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <p>Run payroll, approve runs, and lock periods from the Payroll module. View and download payslips per employee.</p>
            <Link href="/payroll-ui" className="mt-3 inline-block font-medium text-amber-600 hover:text-amber-700">
              Open Payroll →
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
