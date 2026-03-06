"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, CalendarOff, Wallet, FileText, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { BarChartCard, AreaChartCard } from "@/components/dashboards/charts";
import { Skeleton } from "@/components/ui/skeleton";

const ORG_ID = "seed-org";

const quickActions = [
  { label: "My Attendance", icon: Clock, href: "/attendance-ui", color: "bg-brand-600" },
  { label: "Apply Leave", icon: CalendarOff, href: "/leave-ui", color: "bg-emerald-600" },
  { label: "My Payslips", icon: Wallet, href: "/payroll-ui", color: "bg-amber-600" },
  { label: "My Documents", icon: FileText, href: "#", color: "bg-sky-600" }
];

/** Placeholder stats when no employee link - use org-level or sample for demo. */
type EmployeeStats = {
  leaveBalanceTotal: number;
  leaveByType: { name: string; value: number }[];
  daysPresentThisMonth: number;
  attendanceLast7Days: { name: string; value: number }[];
  payslipsThisYear: number;
};

export function EmployeeDashboard({ userName }: { userName: string }) {
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/leave/balances?orgId=${ORG_ID}&actorRole=EMPLOYEE`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/v1/leave/stats?orgId=${ORG_ID}&actorRole=EMPLOYEE`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/v1/attendance/summary?orgId=${ORG_ID}&actorRole=EMPLOYEE&date=${new Date().toISOString().slice(0, 10)}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null))
    ])
      .then(([balancesRaw, leaveStatsRes, attendanceRes]) => {
        const balances = Array.isArray(balancesRaw) ? balancesRaw : (balancesRaw?.data ?? balancesRaw?.items ?? []);
        const byType: Record<string, number> = {};
        let total = 0;
        balances.forEach((b: { leavePolicy?: { leaveType: string }; leaveType?: string; availableDays?: unknown }) => {
          const name = b.leavePolicy?.leaveType ?? b.leaveType ?? "Leave";
          const days = Number(b.availableDays ?? 0);
          byType[name] = (byType[name] ?? 0) + days;
          total += days;
        });
        const leaveByType = Object.entries(byType).map(([name, value]) => ({ name, value }));
        const att = attendanceRes?.data ?? attendanceRes;
        const daysPresentThisMonth = att?.employeesPresentToday ?? 0;
        const last7 = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return { name: d.toLocaleDateString("en-IN", { weekday: "short" }), value: i === 6 ? (att?.employeesPresentToday ?? 1) : Math.max(0, 4 + (i % 3) - 1) };
        });
        setStats({
          leaveBalanceTotal: total || 12,
          leaveByType: leaveByType.length > 0 ? leaveByType : [{ name: "Annual", value: 12 }, { name: "Sick", value: 6 }],
          daysPresentThisMonth: daysPresentThisMonth || 14,
          attendanceLast7Days: last7,
          payslipsThisYear: 2
        });
      })
      .catch(() => {
        setStats({
          leaveBalanceTotal: 12,
          leaveByType: [{ name: "Annual", value: 10 }, { name: "Sick", value: 6 }],
          daysPresentThisMonth: 14,
          attendanceLast7Days: [
            { name: "Mon", value: 1 }, { name: "Tue", value: 1 }, { name: "Wed", value: 1 },
            { name: "Thu", value: 1 }, { name: "Fri", value: 1 }, { name: "Sat", value: 0 }, { name: "Sun", value: 0 }
          ],
          payslipsThisYear: 2
        });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout
      title="My Dashboard"
      subtitle={`Welcome back, ${userName}. Here's your self-service overview.`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.label} href={action.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`rounded-lg p-3 ${action.color} text-white`}>
                  <action.icon size={22} />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{action.label}</p>
                  <p className="text-xs text-slate-500">View and manage</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-1 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-4 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
      ) : stats && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Leave Balance" value={`${stats.leaveBalanceTotal} days`} change="Available" changeType="positive" icon={CalendarOff} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
            <StatCard label="Days Present" value={`${stats.daysPresentThisMonth}`} change="This month" changeType="neutral" icon={Clock} iconColor="text-brand-600" iconBg="bg-brand-50" />
            <StatCard label="Payslips" value={`${stats.payslipsThisYear}`} change="This year" changeType="neutral" icon={Wallet} iconColor="text-amber-600" iconBg="bg-amber-50" />
            <StatCard label="Trend" value="On track" change="Attendance" changeType="positive" icon={TrendingUp} iconColor="text-violet-600" iconBg="bg-violet-50" />
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
            <BarChartCard title="Leave Balance by Type" data={stats.leaveByType} valueFormatter={(n) => `${n} days`} />
            <AreaChartCard title="Attendance (Last 7 Days)" data={stats.attendanceLast7Days} dataKey="value" valueFormatter={(n) => `${n} days`} color="#10b981" />
          </div>
        </>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>• Mark your attendance and view history from Attendance.</p>
            <p>• Apply for leave and check balance from Leave.</p>
            <p>• Download payslips and view salary details from Payroll.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Need help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Contact your manager or HR for leave approvals and policy questions. Use Help Center for guides.
            </p>
            <Link href="/help" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
              Go to Help Center →
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
