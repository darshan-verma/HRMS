"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  CalendarOff,
  PieChart,
  ArrowDownToLine,
  Clock,
  UserCheck,
  UserX,
  Building2,
  BarChart3,
  FileSpreadsheet,
  CalendarClock
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Summary = {
  attritionRate: number;
  headcountGrowth: number;
  payrollCostTrend: number;
  leaveTrend: number;
  diversityIndex: number;
};

type HeadcountDept = { departmentId: string | null; departmentName: string; count: number };

type AttendanceToday = {
  employeesPresentToday: number;
  employeesAbsent: number;
  lateCheckIns: number;
  onLeave: number;
  overtimeHoursToday: number;
  totalEmployees: number;
  expectedToday: number;
};

type LeaveStats = {
  pendingRequests: number;
  employeesOnLeaveToday: number;
  leaveAppliedThisMonth: number;
  averageLeaveUsage: string;
};

type LeaveAnalytics = {
  totalRequests: number;
  totalDays: number;
  byDepartment: { departmentId: string | null; count: number; days: number }[];
  byLeaveType: { leaveType: string; count: number; days: number }[];
};

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

type ShiftStats = {
  totalShifts: number;
  assignedCount: number;
  activeRotations: number;
  pendingRequests: number;
};

type AnalyticsDetail = {
  summary: Summary;
  totalEmployees: number;
  headcountByDepartment: HeadcountDept[];
  attendanceToday: AttendanceToday;
  leaveStats: LeaveStats;
  leaveAnalytics: LeaveAnalytics;
  payroll: {
    latestRun: { id: string; period: string; status: string; startedAt: string };
    summary: PayrollSummary | null;
  } | null;
  shiftStats: ShiftStats;
  recruitment: { openJobs: number; totalCandidates: number; totalInterviews: number };
};

const ORG_ID = "seed-org";

const exportReports = [
  { label: "Payroll Report", type: "payroll", icon: Wallet, color: "text-emerald-600" },
  { label: "Leave Report", type: "leave", icon: CalendarOff, color: "text-brand-600" },
  { label: "Headcount Report", type: "headcount", icon: Users, color: "text-violet-600" }
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`/api/v1/analytics/detail?orgId=${ORG_ID}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load analytics.");
        return (await res.json()) as { data: AnalyticsDetail };
      })
      .then((json) => {
        setData(json.data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      });
  }, []);

  if (error) {
    return (
      <DashboardLayout title="Analytics & Reports" subtitle="Organization metrics and detailed reports">
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      </DashboardLayout>
    );
  }

  const summary = data?.summary;
  const maxDeptCount = data?.headcountByDepartment.length
    ? Math.max(...data.headcountByDepartment.map((d) => d.count), 1)
    : 1;
  const maxLeaveTypeDays = data?.leaveAnalytics.byLeaveType.length
    ? Math.max(...data.leaveAnalytics.byLeaveType.map((t) => t.days), 1)
    : 1;

  return (
    <DashboardLayout
      title="Analytics & Reports"
      subtitle="Organization metrics, attendance, leave, payroll, and recruitment insights"
    >
      {/* Overview KPIs */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Overview</h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
                <Skeleton className="mb-3 h-3 w-24" />
                <Skeleton className="mb-2 h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard
              label="Total Employees"
              value={String(data.totalEmployees)}
              change="Active headcount"
              changeType="neutral"
              icon={Users}
              iconColor="text-brand-600"
              iconBg="bg-brand-50"
            />
            <StatCard
              label="Attrition Rate"
              value={`${summary?.attritionRate ?? 0}%`}
              change={summary && summary.attritionRate < 5 ? "Healthy" : "Review"}
              changeType={summary && summary.attritionRate < 5 ? "positive" : "negative"}
              icon={TrendingDown}
              iconColor="text-rose-600"
              iconBg="bg-rose-50"
            />
            <StatCard
              label="Headcount Growth"
              value={`${summary?.headcountGrowth ?? 0}%`}
              change="YoY"
              changeType={summary && summary.headcountGrowth > 0 ? "positive" : "neutral"}
              icon={TrendingUp}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <StatCard
              label="Payroll (Ledger)"
              value={summary ? formatCurrency(summary.payrollCostTrend) : "—"}
              change="Cumulative trend"
              changeType="neutral"
              icon={Wallet}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
            />
            <StatCard
              label="Leave (Approved)"
              value={String(summary?.leaveTrend ?? 0)}
              change="Requests in period"
              changeType="neutral"
              icon={CalendarOff}
              iconColor="text-brand-600"
              iconBg="bg-brand-50"
            />
            <StatCard
              label="Diversity Index"
              value={`${summary?.diversityIndex ?? 0}%`}
              change={summary && summary.diversityIndex > 50 ? "Above benchmark" : "Below benchmark"}
              changeType={summary && summary.diversityIndex > 50 ? "positive" : "neutral"}
              icon={PieChart}
              iconColor="text-violet-600"
              iconBg="bg-violet-50"
            />
          </div>
        ) : null}
      </section>

      {/* Attendance Today */}
      <section className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Attendance today</h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Present"
              value={String(data.attendanceToday.employeesPresentToday)}
              change={`of ${data.attendanceToday.expectedToday} expected`}
              changeType="positive"
              icon={UserCheck}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <StatCard
              label="Absent"
              value={String(data.attendanceToday.employeesAbsent)}
              change="No check-in"
              changeType={data.attendanceToday.employeesAbsent > 0 ? "negative" : "neutral"}
              icon={UserX}
              iconColor="text-rose-600"
              iconBg="bg-rose-50"
            />
            <StatCard
              label="Late"
              value={String(data.attendanceToday.lateCheckIns)}
              change="Late check-ins"
              changeType="neutral"
              icon={Clock}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
            />
            <StatCard
              label="On leave"
              value={String(data.attendanceToday.onLeave)}
              change="Approved leave"
              changeType="neutral"
              icon={CalendarOff}
              iconColor="text-brand-600"
              iconBg="bg-brand-50"
            />
            <StatCard
              label="Overtime (hrs)"
              value={data.attendanceToday.overtimeHoursToday.toFixed(1)}
              change="Today total"
              changeType="neutral"
              icon={Clock}
              iconColor="text-violet-600"
              iconBg="bg-violet-50"
            />
          </div>
        ) : null}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 size={18} />
              Headcount by department
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="mb-2 h-4 w-32" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : data?.headcountByDepartment.length ? (
              <div className="space-y-4">
                {data.headcountByDepartment.map((dept) => (
                  <div key={dept.departmentId ?? "unassigned"} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{dept.departmentName}</span>
                      <span className="text-sm text-slate-500">{dept.count} employees</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-brand-500 transition-all"
                        style={{ width: `${Math.min((dept.count / maxDeptCount) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No department data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 size={18} />
              Leave by type (approved)
            </CardTitle>
            {data?.leaveAnalytics && (
              <CardDescription>
                {data.leaveAnalytics.totalRequests} requests, {data.leaveAnalytics.totalDays} days total
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="mb-2 h-4 w-24" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : data?.leaveAnalytics.byLeaveType.length ? (
              <div className="space-y-4">
                {data.leaveAnalytics.byLeaveType.map((t) => (
                  <div key={t.leaveType} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{t.leaveType}</span>
                      <span className="text-sm text-slate-500">
                        {t.days} days ({t.count} requests)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-amber-500 transition-all"
                        style={{ width: `${Math.min((t.days / maxLeaveTypeDays) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No leave data in range</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock size={18} />
              Leave summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : data ? (
              <ul className="space-y-3">
                <li className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <span className="text-sm text-slate-600">Pending requests</span>
                  <Badge variant={data.leaveStats.pendingRequests > 0 ? "warning" : "success"}>
                    {data.leaveStats.pendingRequests}
                  </Badge>
                </li>
                <li className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <span className="text-sm text-slate-600">On leave today</span>
                  <span className="text-sm font-medium text-slate-900">{data.leaveStats.employeesOnLeaveToday}</span>
                </li>
                <li className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <span className="text-sm text-slate-600">Applied this month</span>
                  <span className="text-sm font-medium text-slate-900">{data.leaveStats.leaveAppliedThisMonth}</span>
                </li>
                <li className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <span className="text-sm text-slate-600">Avg usage</span>
                  <span className="text-sm font-medium text-slate-900">{data.leaveStats.averageLeaveUsage} days</span>
                </li>
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet size={18} />
              Latest payroll run
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            ) : data?.payroll ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Period</span>
                  <Badge variant="info">{data.payroll.latestRun.period}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Status</span>
                  <span className="font-medium capitalize text-slate-900">{data.payroll.latestRun.status.toLowerCase()}</span>
                </div>
                {data.payroll.summary && (
                  <>
                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-xs text-slate-500">Employees processed</p>
                      <p className="text-lg font-semibold text-slate-900">{data.payroll.summary.totalEmployeesProcessed}</p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Net payable</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(data.payroll.summary.netPayable)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Cost to company</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(data.payroll.summary.costToCompanyTotal)}</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No payroll run yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={18} />
              Shifts & recruitment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : data ? (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase text-slate-500">Shifts</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span className="text-slate-600">Active shifts</span>
                      <span className="font-medium text-slate-900">{data.shiftStats.totalShifts}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-600">Assigned</span>
                      <span className="font-medium text-slate-900">{data.shiftStats.assignedCount}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-600">Pending change requests</span>
                      <Badge variant={data.shiftStats.pendingRequests > 0 ? "warning" : "success"}>
                        {data.shiftStats.pendingRequests}
                      </Badge>
                    </li>
                  </ul>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase text-slate-500">Recruitment</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span className="text-slate-600">Open jobs</span>
                      <span className="font-medium text-slate-900">{data.recruitment.openJobs}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-600">Candidates</span>
                      <span className="font-medium text-slate-900">{data.recruitment.totalCandidates}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-600">Interviews</span>
                      <span className="font-medium text-slate-900">{data.recruitment.totalInterviews}</span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Metrics breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {summary ? (
              <div className="space-y-5">
                {[
                  { label: "Attrition Rate", value: summary.attritionRate, max: 15, color: "bg-rose-500", suffix: "%" },
                  { label: "Headcount Growth", value: summary.headcountGrowth, max: 20, color: "bg-emerald-500", suffix: "%" },
                  { label: "Diversity Index", value: summary.diversityIndex, max: 100, color: "bg-violet-500", suffix: "%" },
                  { label: "Leave (approved)", value: summary.leaveTrend, max: 30, color: "bg-amber-500", suffix: " days" },
                  { label: "Payroll (ledger)", value: summary.payrollCostTrend, max: Math.max(summary.payrollCostTrend, 100), color: "bg-brand-500", suffix: "" }
                ].map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{item.label}</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {typeof item.value === "number" && item.suffix === "" ? formatCurrency(item.value) : `${item.value}${item.suffix}`}
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet size={18} />
              Export reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-slate-500">
              Download detailed CSV reports for analysis and compliance.
            </p>
            <div className="space-y-3">
              {exportReports.map((report) => (
                <button
                  key={report.type}
                  type="button"
                  onClick={() => window.open(`/api/v1/reports/export?orgId=${ORG_ID}&type=${report.type}`)}
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
