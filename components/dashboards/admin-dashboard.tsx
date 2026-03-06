"use client";

import { useEffect, useState } from "react";
import {
  Users,
  TrendingDown,
  CalendarOff,
  Wallet,
  UserPlus,
  Clock,
  ArrowUpRight,
  Briefcase,
  FileText,
  CheckCircle2,
  CalendarClock,
  RotateCcw,
  AlertCircle,
  PieChart
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChartCard, PieChartCard } from "@/components/dashboards/charts";

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

type DetailData = {
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

const recentActivity = [
  { id: 1, icon: UserPlus, text: "New employee Priya Singh onboarded", time: "2 hours ago", color: "text-emerald-600", bg: "bg-emerald-50" },
  { id: 2, icon: CalendarOff, text: "Leave approved for Rahul Mehta", time: "3 hours ago", color: "text-brand-600", bg: "bg-brand-50" },
  { id: 3, icon: Wallet, text: "February payroll processing started", time: "5 hours ago", color: "text-amber-600", bg: "bg-amber-50" },
  { id: 4, icon: Briefcase, text: "New job posting: Senior Engineer", time: "1 day ago", color: "text-violet-600", bg: "bg-violet-50" },
  { id: 5, icon: CheckCircle2, text: "Attendance marked for 45 employees", time: "1 day ago", color: "text-emerald-600", bg: "bg-emerald-50" },
  { id: 6, icon: FileText, text: "Policy document updated", time: "2 days ago", color: "text-sky-600", bg: "bg-sky-50" }
];

const quickActions = [
  { label: "Mark Attendance", icon: Clock, href: "/attendance-ui", color: "bg-brand-600" },
  { label: "Apply Leave", icon: CalendarOff, href: "/leave-ui", color: "bg-emerald-600" },
  { label: "Run Payroll", icon: Wallet, href: "/payroll-ui", color: "bg-amber-600" },
  { label: "Post Job", icon: Briefcase, href: "/recruitment-ui", color: "bg-violet-600" }
];

const moduleLinks = [
  { label: "Employees", href: "/employees" },
  { label: "Attendance", href: "/attendance-ui" },
  { label: "Leave", href: "/leave-ui" },
  { label: "Payroll", href: "/payroll-ui" },
  { label: "Recruitment", href: "/recruitment-ui" },
  { label: "Shifts", href: "/shifts" },
  { label: "Settings", href: "/settings" },
  { label: "Analytics", href: "/analytics" }
];

const upcomingEvents = [
  { title: "Monthly Payroll Run", date: "Mar 1, 2026", type: "payroll" },
  { title: "Leave Accrual", date: "Mar 1, 2026", type: "leave" },
  { title: "Performance Review Cycle", date: "Mar 15, 2026", type: "review" },
  { title: "Team Building Event", date: "Mar 20, 2026", type: "event" }
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function AdminDashboard({ userName }: { userName: string }) {
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

  const summary = data?.summary;

  return (
    <DashboardLayout title="Super Admin Dashboard" subtitle={`Welcome back, ${userName}. Full organization overview and controls.`}>
      {/* Row 1: Core org metrics */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Organization at a glance</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
              <Skeleton className="mb-3 h-3 w-24" />
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Total Employees"
              value={data ? `${data.totalEmployees}` : "128"}
              change={summary ? `+${summary.headcountGrowth}% from last month` : "+4.2% from last month"}
              changeType="positive"
              icon={Users}
              iconColor="text-brand-600"
              iconBg="bg-brand-50"
            />
            <StatCard
              label="Attrition Rate"
              value={summary ? `${summary.attritionRate}%` : "2.4%"}
              change={summary && summary.attritionRate > 3 ? "Above" : "Below industry avg"}
              changeType={summary && summary.attritionRate > 3 ? "negative" : "positive"}
              icon={TrendingDown}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <StatCard
              label="Leave Requests"
              value={summary ? `${Math.round(summary.leaveTrend)}` : "12"}
              change="This month pending"
              changeType="neutral"
              icon={CalendarOff}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
            />
            <StatCard
              label="Payroll Cost"
              value={summary ? `₹${(summary.payrollCostTrend / 1e5).toFixed(1)}L` : "₹24.5L"}
              change={summary ? `Trend total` : "+2.1% from last month"}
              changeType="neutral"
              icon={Wallet}
              iconColor="text-violet-600"
              iconBg="bg-violet-50"
            />
          </>
        )}
      </div>
      </section>

      {/* Row 2: Leave, Payroll, Shifts, Recruitment */}
      {!loading && data && (
        <section className="mt-8">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Operations summary</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Pending Leave" value={String(data.leaveStats.pendingRequests)} change="Awaiting approval" changeType="neutral" icon={CalendarOff} iconColor="text-amber-600" iconBg="bg-amber-50" />
            <StatCard label="On Leave Today" value={String(data.leaveStats.employeesOnLeaveToday)} change="Out of office" changeType="neutral" icon={CalendarClock} iconColor="text-sky-600" iconBg="bg-sky-50" />
            <StatCard label="Payroll Run" value={data.payroll?.latestRun?.status ?? "—"} change={data.payroll?.latestRun?.period ?? "No run"} changeType="neutral" icon={Wallet} iconColor="text-violet-600" iconBg="bg-violet-50" />
            <StatCard label="Open Positions" value={String(data.recruitment.openJobs)} change={`${data.recruitment.totalCandidates} candidates`} changeType="neutral" icon={Briefcase} iconColor="text-rose-600" iconBg="bg-rose-50" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Shifts" value={String(data.shiftStats.totalShifts)} change={`${data.shiftStats.assignedCount} assigned`} changeType="neutral" icon={Clock} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
            <StatCard label="Shift Rotations" value={String(data.shiftStats.activeRotations)} change="Active" changeType="neutral" icon={RotateCcw} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
            <StatCard label="Shift Change Req." value={String(data.shiftStats.pendingRequests)} change="Pending" changeType="neutral" icon={AlertCircle} iconColor="text-amber-600" iconBg="bg-amber-50" />
            <StatCard label="Diversity Index" value={summary ? `${summary.diversityIndex}%` : "—"} change="Role spread" changeType="neutral" icon={PieChart} iconColor="text-slate-600" iconBg="bg-slate-50" />
          </div>
        </section>
      )}

      {/* Charts row */}
      {!loading && data && (
        <>
        <section className="mt-8">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">People & attendance</h2>
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
          {data.headcountByDepartment.length > 0 ? (
            <BarChartCard
              title="Headcount by Department"
              data={data.headcountByDepartment.map((d) => ({
                name: d.departmentName.length > 12 ? d.departmentName.slice(0, 11) + "…" : d.departmentName,
                value: d.count
              }))}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Headcount by Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">No department data yet</div>
              </CardContent>
            </Card>
          )}
          <PieChartCard
            title="Attendance Today"
            data={[
              { name: "Present", value: data.attendanceToday.employeesPresentToday },
              { name: "Absent", value: data.attendanceToday.employeesAbsent },
              { name: "On Leave", value: data.attendanceToday.onLeave }
            ].filter((d) => d.value > 0)}
            valueFormatter={(n) => `${n} employees`}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today&apos;s attendance summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Present</span>
                <span className="font-semibold text-slate-900">{data.attendanceToday.employeesPresentToday}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Absent</span>
                <span className="font-semibold text-slate-900">{data.attendanceToday.employeesAbsent}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Late check-ins</span>
                <span className="font-semibold text-amber-600">{data.attendanceToday.lateCheckIns}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">On leave</span>
                <span className="font-semibold text-sky-600">{data.attendanceToday.onLeave}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Overtime (hrs)</span>
                <span className="font-semibold text-emerald-600">{(data.attendanceToday.overtimeHoursToday ?? 0).toFixed(1)}</span>
              </div>
              <a href="/attendance-ui" className="mt-2 block text-center text-xs font-medium text-brand-600 hover:text-brand-700">View attendance →</a>
            </CardContent>
          </Card>
        </div>
        </section>

        {/* Leave & Payroll charts */}
        <section className="mt-8">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Leave & payroll</h2>
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
            {data.leaveAnalytics.byLeaveType.length > 0 && (
              <BarChartCard
                title="Leave Usage by Type (YTD)"
                data={data.leaveAnalytics.byLeaveType.map((t) => ({
                  name: t.leaveType,
                  value: t.days
                }))}
                valueFormatter={(n) => `${n} days`}
              />
            )}
            {data.leaveAnalytics.byDepartment.length > 0 && (() => {
              const nameMap = Object.fromEntries(data.headcountByDepartment.map((h) => [h.departmentId ?? "null", h.departmentName]));
              return (
                <BarChartCard
                  title="Leave by Department (YTD days)"
                  data={data.leaveAnalytics.byDepartment.map((d) => ({
                    name: (nameMap[d.departmentId ?? "null"] ?? "Unassigned").slice(0, 10),
                    value: d.days
                  }))}
                  valueFormatter={(n) => `${n} days`}
                />
              );
            })()}
            {data.payroll?.summary && (
              <>
                <BarChartCard
                  title="Payroll Cost Breakdown"
                  data={[
                    { name: "Gross", value: Number(data.payroll.summary.grossEarnings) },
                    { name: "Deductions", value: Number(data.payroll.summary.totalDeductions) },
                    { name: "Net Pay", value: Number(data.payroll.summary.netPayable) }
                  ]}
                  valueFormatter={(n) => formatCurrency(n)}
                />
                <PieChartCard
                  title="Cost Distribution"
                  data={[
                    { name: "Gross", value: Number(data.payroll.summary.grossEarnings) },
                    { name: "Deductions", value: Number(data.payroll.summary.totalDeductions) }
                  ].filter((d) => d.value > 0)}
                  valueFormatter={(n) => formatCurrency(n)}
                  colors={["#f59e0b", "#0ea5e9"]}
                />
              </>
            )}
          </div>
        </section>

        {/* Recruitment pipeline */}
        <section className="mt-8">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Recruitment</h2>
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
            <BarChartCard
              title="Recruitment Pipeline"
              data={[
                { name: "Open Jobs", value: data.recruitment.openJobs },
                { name: "Candidates", value: data.recruitment.totalCandidates },
                { name: "Interviews", value: data.recruitment.totalInterviews }
              ]}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leave summary (YTD)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Total requests</span><span className="font-medium">{data.leaveAnalytics.totalRequests}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Total days taken</span><span className="font-medium">{data.leaveAnalytics.totalDays}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Avg leave per employee</span><span className="font-medium">{data.leaveStats.averageLeaveUsage} days</span></div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Shifts & Attendance detail */}
        <section className="mt-8">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Shifts & today&apos;s attendance</h2>
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Shift operations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Total shifts</span><span className="font-medium">{data.shiftStats.totalShifts}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Assignments</span><span className="font-medium">{data.shiftStats.assignedCount}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Active rotations</span><span className="font-medium">{data.shiftStats.activeRotations}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Pending change requests</span><span className="font-medium">{data.shiftStats.pendingRequests}</span></div>
                <a href="/shifts" className="mt-3 inline-block text-xs font-medium text-brand-600 hover:text-brand-700">Manage shifts →</a>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attendance today</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Present</span><span className="font-medium">{data.attendanceToday.employeesPresentToday}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Absent</span><span className="font-medium">{data.attendanceToday.employeesAbsent}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Late check-ins</span><span className="font-medium">{data.attendanceToday.lateCheckIns}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">On leave</span><span className="font-medium">{data.attendanceToday.onLeave}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Overtime (hours)</span><span className="font-medium">{data.attendanceToday.overtimeHoursToday?.toFixed(1) ?? "0"}</span></div>
                <a href="/attendance-ui" className="mt-3 inline-block text-xs font-medium text-brand-600 hover:text-brand-700">View attendance →</a>
              </CardContent>
            </Card>
          </div>
        </section>
        </>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center transition-all hover:border-brand-200 hover:bg-brand-50/50 hover:shadow-sm"
                >
                  <div className={`rounded-lg p-2 ${action.color} text-white transition-transform group-hover:scale-110`}>
                    <action.icon size={18} />
                  </div>
                  <span className="text-xs font-medium text-slate-700">{action.label}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All modules</CardTitle>
            <p className="text-xs text-slate-500">Jump to any area</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {moduleLinks.map((m) => (
                <a key={m.label} href={m.href} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-brand-100 hover:text-brand-700">
                  {m.label}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <a href="/analytics" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
              View all <ArrowUpRight size={12} />
            </a>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50"
                >
                  <div className={`rounded-lg p-2 ${item.bg}`}>
                    <item.icon size={16} className={item.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm text-slate-700">{item.text}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingEvents.map((event, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-brand-500" />
                    <span className="text-sm font-medium text-slate-700">{event.title}</span>
                  </div>
                  <span className="text-xs text-slate-400">{event.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Department Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data?.headcountByDepartment.length
                ? data.headcountByDepartment
                : [
                    { departmentName: "Engineering", count: 42 },
                    { departmentName: "Product", count: 18 },
                    { departmentName: "Design", count: 12 },
                    { departmentName: "Marketing", count: 22 },
                    { departmentName: "Sales", count: 20 },
                    { departmentName: "Operations", count: 14 }
                  ]
              ).map((item) => {
                const total = data?.totalEmployees ?? 128;
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.departmentName} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{item.departmentName}</span>
                      <span className="text-xs text-slate-500">{item.count} employees</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-brand-500 transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
