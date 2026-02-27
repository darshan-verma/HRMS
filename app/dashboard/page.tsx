"use client";

import { useEffect, useState } from "react";
import {
  Users,
  TrendingUp,
  TrendingDown,
  CalendarOff,
  Wallet,
  UserPlus,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  FileText,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Summary = {
  attritionRate: number;
  headcountGrowth: number;
  payrollCostTrend: number;
  leaveTrend: number;
  diversityIndex: number;
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

const upcomingEvents = [
  { title: "Monthly Payroll Run", date: "Mar 1, 2026", type: "payroll" },
  { title: "Leave Accrual", date: "Mar 1, 2026", type: "leave" },
  { title: "Performance Review Cycle", date: "Mar 15, 2026", type: "review" },
  { title: "Team Building Event", date: "Mar 20, 2026", type: "event" }
];

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`/api/v1/analytics/summary?orgId=${ORG_ID}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ data: Summary }>) : null))
      .then((json) => {
        setSummary(json?.data ?? null);
        setLoading(false);
      })
      .catch(() => {
        setSummary(null);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome back, Darshan. Here's your HR overview.">
      {/* Stat Cards */}
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
              value={summary ? `${Math.round(summary.headcountGrowth * 10)}` : "128"}
              change={summary ? `+${summary.headcountGrowth}% from last month` : "+4.2% from last month"}
              changeType="positive"
              icon={Users}
              iconColor="text-brand-600"
              iconBg="bg-brand-50"
            />
            <StatCard
              label="Attrition Rate"
              value={summary ? `${summary.attritionRate}%` : "2.4%"}
              change={summary ? `${summary.attritionRate > 3 ? "Above" : "Below"} industry avg` : "Below industry avg"}
              changeType={summary && summary.attritionRate > 3 ? "negative" : "positive"}
              icon={TrendingDown}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <StatCard
              label="Leave Requests"
              value={summary ? `${summary.leaveTrend}` : "12"}
              change="This month pending"
              changeType="neutral"
              icon={CalendarOff}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
            />
            <StatCard
              label="Payroll Cost"
              value={summary ? `₹${(summary.payrollCostTrend * 100).toLocaleString()}K` : "₹24.5L"}
              change={summary ? `Trend: ${summary.payrollCostTrend}` : "+2.1% from last month"}
              changeType="neutral"
              icon={Wallet}
              iconColor="text-violet-600"
              iconBg="bg-violet-50"
            />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
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

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
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
        {/* Upcoming Events */}
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

        {/* Department Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Department Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { dept: "Engineering", count: 42, pct: 33 },
                { dept: "Product", count: 18, pct: 14 },
                { dept: "Design", count: 12, pct: 9 },
                { dept: "Marketing", count: 22, pct: 17 },
                { dept: "Sales", count: 20, pct: 16 },
                { dept: "Operations", count: 14, pct: 11 }
              ].map((item) => (
                <div key={item.dept} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{item.dept}</span>
                    <span className="text-xs text-slate-500">{item.count} employees</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-brand-500 transition-all"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
