"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, CalendarOff, UserPlus, FileText, BarChart3, UserCheck } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { BarChartCard, PieChartCard } from "@/components/dashboards/charts";
import { Skeleton } from "@/components/ui/skeleton";

const ORG_ID = "seed-org";

type DetailData = {
  totalEmployees: number;
  headcountByDepartment: { departmentId: string | null; departmentName: string; count: number }[];
  attendanceToday: { employeesPresentToday: number; employeesAbsent: number; onLeave: number };
  leaveStats: { pendingRequests: number; employeesOnLeaveToday: number };
  leaveAnalytics: { byLeaveType: { leaveType: string; count: number; days: number }[] };
  recruitment: { openJobs: number; totalCandidates: number; totalInterviews: number };
};

const quickActions = [
  { label: "Employees", icon: Users, href: "/employees", color: "bg-brand-600" },
  { label: "Leave Management", icon: CalendarOff, href: "/leave-ui", color: "bg-amber-600" },
  { label: "Recruitment", icon: UserPlus, href: "/recruitment-ui", color: "bg-violet-600" },
  { label: "Attendance", icon: BarChart3, href: "/attendance-ui", color: "bg-emerald-600" },
  { label: "Policies & Docs", icon: FileText, href: "/settings", color: "bg-sky-600" }
];

export function HRDashboard({ userName }: { userName: string }) {
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

  return (
    <DashboardLayout
      title="HR Dashboard"
      subtitle={`Welcome, ${userName}. HR operations and people overview.`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Total Employees" value={String(data?.totalEmployees ?? 0)} change="Active headcount" changeType="neutral" icon={Users} iconColor="text-brand-600" iconBg="bg-brand-50" />
            <StatCard label="Pending Leave" value={String(data?.leaveStats?.pendingRequests ?? 0)} change="Awaiting approval" changeType="neutral" icon={CalendarOff} iconColor="text-amber-600" iconBg="bg-amber-50" />
            <StatCard label="On Leave Today" value={String(data?.leaveStats?.employeesOnLeaveToday ?? 0)} change="Out of office" changeType="neutral" icon={UserCheck} iconColor="text-sky-600" iconBg="bg-sky-50" />
            <StatCard label="Open Positions" value={String(data?.recruitment?.openJobs ?? 0)} change="In recruitment" changeType="neutral" icon={UserPlus} iconColor="text-violet-600" iconBg="bg-violet-50" />
          </>
        )}
      </div>

      {!loading && data && (
        <div className="mt-6 grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
          {data.headcountByDepartment.length > 0 && (
            <BarChartCard
              title="Headcount by Department"
              data={data.headcountByDepartment.map((d) => ({
                name: d.departmentName.length > 10 ? d.departmentName.slice(0, 9) + "…" : d.departmentName,
                value: d.count
              }))}
            />
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
          {data.leaveAnalytics.byLeaveType.length > 0 && (
            <BarChartCard
              title="Leave Usage by Type (YTD)"
              data={data.leaveAnalytics.byLeaveType.map((t) => ({ name: t.leaveType, value: t.days }))}
              valueFormatter={(n) => `${n} days`}
            />
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>HR focus areas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>• Employee lifecycle, leave policies, and recruitment pipeline.</p>
            <p>• Attendance and compliance. Policies in Settings.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-brand-100 hover:text-brand-700"
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
