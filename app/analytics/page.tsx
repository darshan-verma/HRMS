"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  CalendarOff,
  PieChart,
  ArrowDownToLine
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Summary = {
  attritionRate: number;
  headcountGrowth: number;
  payrollCostTrend: number;
  leaveTrend: number;
  diversityIndex: number;
};

const ORG_ID = "seed-org";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`/api/v1/analytics/summary?orgId=${ORG_ID}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load analytics.");
        return (await res.json()) as { data: Summary };
      })
      .then((json) => {
        setSummary(json.data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      });
  }, []);

  const exportReports = [
    { label: "Payroll Report", type: "payroll", icon: Wallet, color: "text-emerald-600" },
    { label: "Leave Report", type: "leave", icon: CalendarOff, color: "text-brand-600" },
    { label: "Headcount Report", type: "headcount", icon: Users, color: "text-violet-600" }
  ];

  return (
    <DashboardLayout title="Analytics & Reports" subtitle="Organization metrics, trends, and downloadable reports">
      {/* Stats */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
              <Skeleton className="mb-3 h-3 w-24" />
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Attrition Rate"
            value={`${summary.attritionRate}%`}
            change={summary.attritionRate < 5 ? "Healthy range" : "Needs attention"}
            changeType={summary.attritionRate < 5 ? "positive" : "negative"}
            icon={TrendingDown}
            iconColor="text-rose-600"
            iconBg="bg-rose-50"
          />
          <StatCard
            label="Headcount Growth"
            value={`${summary.headcountGrowth}%`}
            change="Year over year"
            changeType={summary.headcountGrowth > 0 ? "positive" : "negative"}
            icon={TrendingUp}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
          />
          <StatCard
            label="Payroll Trend"
            value={`${summary.payrollCostTrend}`}
            change="Monthly trend"
            changeType="neutral"
            icon={Wallet}
            iconColor="text-brand-600"
            iconBg="bg-brand-50"
          />
          <StatCard
            label="Leave Trend"
            value={`${summary.leaveTrend}`}
            change="Avg days/employee"
            changeType="neutral"
            icon={CalendarOff}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
          <StatCard
            label="Diversity Index"
            value={`${summary.diversityIndex}%`}
            change={summary.diversityIndex > 50 ? "Above benchmark" : "Below benchmark"}
            changeType={summary.diversityIndex > 50 ? "positive" : "neutral"}
            icon={PieChart}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Metrics Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Metrics Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {summary ? (
              <div className="space-y-5">
                {[
                  { label: "Attrition Rate", value: summary.attritionRate, max: 15, color: "bg-rose-500", suffix: "%" },
                  { label: "Headcount Growth", value: summary.headcountGrowth, max: 20, color: "bg-emerald-500", suffix: "%" },
                  { label: "Diversity Index", value: summary.diversityIndex, max: 100, color: "bg-violet-500", suffix: "%" },
                  { label: "Leave Trend", value: summary.leaveTrend, max: 30, color: "bg-amber-500", suffix: " days" },
                  { label: "Payroll Cost", value: summary.payrollCostTrend, max: 100, color: "bg-brand-500", suffix: "" }
                ].map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{item.label}</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {item.value}{item.suffix}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full transition-all ${item.color}`}
                        style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="mb-2 h-4 w-32" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Export Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Export Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-slate-500">
              Download detailed CSV reports for analysis and compliance.
            </p>
            <div className="space-y-3">
              {exportReports.map((report) => (
                <button
                  key={report.type}
                  onClick={() =>
                    window.open(`/api/v1/reports/export?orgId=${ORG_ID}&type=${report.type}`)
                  }
                  className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 text-left transition-all hover:border-brand-200 hover:bg-brand-50/30 hover:shadow-sm"
                >
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <report.icon size={20} className={report.color} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{report.label}</p>
                    <p className="text-xs text-slate-500">Download as CSV</p>
                  </div>
                  <ArrowDownToLine size={16} className="text-slate-400" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
