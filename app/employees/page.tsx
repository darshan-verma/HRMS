"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, RefreshCw, Search, Inbox, Building2, Mail, Hash } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

type Employee = {
  id: string;
  fullName: string;
  email: string;
  employeeCode: string;
  status: string;
  departmentId?: string;
  designation?: string;
  joiningDate?: string;
};

const statusBadge: Record<string, "success" | "danger" | "warning" | "info"> = {
  ACTIVE: "success",
  INACTIVE: "danger",
  ON_NOTICE: "warning",
  PROBATION: "info"
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const query = useMemo(
    () => new URLSearchParams({ orgId: "seed-org", actorRole: "HR_ADMIN" }).toString(),
    []
  );

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/v1/employees?${query}`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as Employee[];
      setEmployees(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, [query]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const filtered = employees.filter(
    (e) =>
      e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Employees" subtitle="Manage your organization's workforce">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Employees"
          value={loading ? "--" : `${employees.length}`}
          icon={Users}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <StatCard
          label="Active"
          value={loading ? "--" : `${employees.filter((e) => e.status === "ACTIVE").length}`}
          icon={Users}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="On Probation"
          value={loading ? "--" : `${employees.filter((e) => e.status === "PROBATION").length}`}
          icon={Users}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Departments"
          value={loading ? "--" : `${new Set(employees.map((e) => e.departmentId).filter(Boolean)).size}`}
          icon={Building2}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
      </div>

      {/* Employee Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
            <Button variant="outline" size="sm" onClick={loadEmployees}>
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={searchTerm ? "No matching employees" : "No employees found"}
              description={
                searchTerm
                  ? "Try adjusting your search terms."
                  : "No employee data is available yet."
              }
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <Table>
                <THead>
                  <tr>
                    <TH>Employee</TH>
                    <TH>Code</TH>
                    <TH>Designation</TH>
                    <TH>Joined</TH>
                    <TH>Status</TH>
                  </tr>
                </THead>
                <TBody>
                  {filtered.map((emp) => (
                    <tr key={emp.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                      <TD>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                            {emp.fullName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{emp.fullName}</p>
                            <p className="text-xs text-slate-400">{emp.email}</p>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">
                          {emp.employeeCode}
                        </span>
                      </TD>
                      <TD>{emp.designation ?? "-"}</TD>
                      <TD>{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : "-"}</TD>
                      <TD>
                        <Badge variant={statusBadge[emp.status] ?? "outline"}>{emp.status}</Badge>
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
