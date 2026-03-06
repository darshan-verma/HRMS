"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, CalendarOff, Clock, UserPlus, CheckCircle2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { BarChartCard, PieChartCard } from "@/components/dashboards/charts";
import { Skeleton } from "@/components/ui/skeleton";

const ORG_ID = "seed-org";

type DetailData = {
  summary: { attritionRate: number; headcountGrowth: number; payrollCostTrend: number; leaveTrend: number; diversityIndex: number };
  totalEmployees: number;
  headcountByDepartment: { departmentId: string | null; departmentName: string; count: number }[];
  attendanceToday: {
    employeesPresentToday: number;
    employeesAbsent: number;
    lateCheckIns: number;
    onLeave: number;
    totalEmployees: number;
    expectedToday: number;
  };
  leaveStats: { pendingRequests: number; employeesOnLeaveToday: number; leaveAppliedThisMonth: number };
  leaveAnalytics: { byLeaveType: { leaveType: string; count: number; days: number }[] };
  recruitment: { openJobs: number; totalCandidates: number; totalInterviews: number };
};

const quickActions = [
  { label: "Team Attendance", icon: Clock, href: "/attendance-ui", color: "bg-brand-600" },
  { label: "Leave Approvals", icon: CalendarOff, href: "/leave-ui", color: "bg-amber-600" },
  { label: "Team Directory", icon: Users, href: "/employees", color: "bg-emerald-600" },
  { label: "Recruitment", icon: UserPlus, href: "/recruitment-ui", color: "bg-violet-600" }
];

export function ManagerDashboard({ userName }: { userName: string }) {
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

  const att = data?.attendanceToday;
  const leaveStats = data?.leaveStats;
  const recruitment = data?.recruitment;
  return (
    <DashboardLayout
      title="Manager Dashboard"
      subtitle={`Welcome, ${userName}. Manage your team and approvals.`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Pending Leave"
              value={String(leaveStats?.pendingRequests ?? 0)}
              change="Awaiting your approval"
              changeType="neutral"
              icon={CalendarOff}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
            />
            <StatCard
              label="Team Size"
              value={String(data?.totalEmployees ?? 0)}
              change="Direct reports"
              changeType="neutral"
              icon={Users}
              iconColor="text-brand-600"
              iconBg="bg-brand-50"
            />
            <StatCard
              label="Attendance Today"
              value={att ? `${att.employeesPresentToday}/${att.expectedToday}` : "—"}
              change="Checked in"
              changeType="positive"
              icon={Clock}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <StatCard
              label="Open Roles"
              value={String(recruitment?.openJobs ?? 0)}
              change="In recruitment"
              changeType="neutral"
              icon={UserPlus}
              iconColor="text-violet-600"
              iconBg="bg-violet-50"
            />
          </>
        )}
      </div>

      {!loading && data && (
        <div className="mt-6 grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
          <PieChartCard
            title="Team Attendance Today"
            data={[
              { name: "Present", value: att?.employeesPresentToday ?? 0 },
              { name: "Absent", value: att?.employeesAbsent ?? 0 },
              { name: "On Leave", value: att?.onLeave ?? 0 }
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
          <BarChartCard
            title="Recruitment Pipeline"
            data={[
              { name: "Open Jobs", value: recruitment?.openJobs ?? 0 },
              { name: "Candidates", value: recruitment?.totalCandidates ?? 0 },
              { name: "Interviews", value: recruitment?.totalInterviews ?? 0 }
            ]}
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
                  className="group flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center transition-all hover:border-brand-200 hover:bg-brand-50/50"
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
            <CardTitle>Recent approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 rounded-lg border border-slate-100 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <p className="text-sm text-slate-600">No pending leave requests at the moment.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
