"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  RefreshCw,
  Search,
  Inbox,
  Building2,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal, FormField, Input } from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type DepartmentOption = { id: string; name: string };

type EmployeeItem = {
  id: string;
  fullName: string;
  email?: string | null;
  employeeCode: string;
  status: string;
  departmentId?: string | null;
  designation: string;
  joiningDate?: string;
  department?: { id: string; name: string } | null;
  isDeleted?: boolean;
  createdAt?: string;
};

const statusBadge: Record<string, "success" | "danger" | "warning" | "info"> = {
  ACTIVE: "success",
  INACTIVE: "danger",
  ON_NOTICE: "warning",
  PROBATION: "info"
};

const ORG_ID = "seed-org";
const ACTOR_ROLE = "HR_ADMIN";
const PAGE_SIZE = 10;

function mapItem(raw: Record<string, unknown>): EmployeeItem {
  const id = String(raw.id ?? "");
  const fullName = String(raw.fullName ?? "");
  const employeeCode = String(raw.employeeCode ?? "");
  const designation = String(raw.designation ?? "");
  const departmentId = raw.departmentId != null ? String(raw.departmentId) : null;
  const isDeleted = Boolean(raw.isDeleted);
  const createdAt = raw.createdAt as Date | string | undefined;
  const dep = raw.department as { id: string; name: string } | null | undefined;
  const department = dep && typeof dep === "object" && "name" in dep ? { id: String(dep.id), name: String(dep.name) } : null;

  return {
    id,
    fullName,
    email: null,
    employeeCode,
    status: isDeleted ? "INACTIVE" : "ACTIVE",
    departmentId,
    designation,
    joiningDate: createdAt
      ? typeof createdAt === "string"
        ? createdAt
        : (createdAt as Date).toISOString?.() ?? ""
      : undefined,
    department,
    isDeleted,
    createdAt: typeof createdAt === "string" ? createdAt : (createdAt as Date)?.toISOString?.()
  };
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  const [modalOpen, setModalOpen] = useState<"edit" | "delete" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formEmployeeCode, setFormEmployeeCode] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formDesignation, setFormDesignation] = useState("");
  const [formDepartmentId, setFormDepartmentId] = useState("");
  const [formSalary, setFormSalary] = useState("");
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  const query = useMemo(
    () =>
      new URLSearchParams({
        orgId: ORG_ID,
        actorRole: ACTOR_ROLE,
        page: String(page),
        pageSize: String(PAGE_SIZE)
      }).toString(),
    [page]
  );

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/v1/employees?${query}`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { items: unknown[]; total: number; page: number; pageSize: number };
      const items = Array.isArray(data.items) ? data.items.map((i: unknown) => mapItem((i ?? {}) as Record<string, unknown>)) : [];
      setEmployees(items);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } else {
      setEmployees([]);
      setTotal(0);
    }
    setLoading(false);
  }, [query]);

  const loadDepartments = useCallback(async () => {
    const q = new URLSearchParams({ orgId: ORG_ID, actorRole: ACTOR_ROLE }).toString();
    const res = await fetch(`/api/v1/departments?${q}`, { cache: "no-store" });
    if (res.ok) {
      const list = (await res.json()) as DepartmentOption[];
      setDepartments(Array.isArray(list) ? list : []);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  const filtered = employees.filter(
    (e) =>
      e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.email ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.department?.name ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const departmentMap = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);

  function getDepartmentName(emp: EmployeeItem): string {
    const fromApi = emp.department?.name;
    const fromMap = emp.departmentId ? (departmentMap.get(emp.departmentId) ?? "") : "";
    return (fromApi ?? fromMap) || "—";
  }

  function openEdit(emp: EmployeeItem) {
    setEditingId(emp.id);
    setFormEmployeeCode(emp.employeeCode);
    setFormFullName(emp.fullName);
    setFormDesignation(emp.designation);
    setFormDepartmentId(emp.departmentId ?? "");
    setFormSalary("");
    setFormError("");
    setModalOpen("edit");
  }

  function openDelete(emp: EmployeeItem) {
    setDeleteId(emp.id);
    setModalOpen("delete");
  }

  function closeModal() {
    setModalOpen(null);
    setEditingId(null);
    setDeleteId(null);
    setFormError("");
  }

  async function handleSubmitEdit() {
    if (!editingId) return;
    setFormError("");
    if (!formFullName.trim() || !formDesignation.trim()) {
      setFormError("Full name and designation are required.");
      return;
    }
    setFormSubmitting(true);
    try {
      const res = await fetch("/api/v1/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: ACTOR_ROLE,
          employeeId: editingId,
          fullName: formFullName.trim(),
          designation: formDesignation.trim(),
          departmentId: (formDepartmentId === "" || formDepartmentId === "none") ? null : formDepartmentId,
          salaryPlain: formSalary.trim() || undefined
        })
      });
      if (!res.ok) {
        const err = (await res.json()).message || "Failed to update employee";
        setFormError(err);
        return;
      }
      closeModal();
      await loadEmployees();
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setFormSubmitting(true);
    try {
      const res = await fetch("/api/v1/employees", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: ACTOR_ROLE,
          employeeId: deleteId
        })
      });
      if (!res.ok) {
        setFormError("Failed to delete employee.");
        return;
      }
      closeModal();
      await loadEmployees();
    } finally {
      setFormSubmitting(false);
    }
  }

  const deleteEmployee = deleteId ? employees.find((e) => e.id === deleteId) : null;

  return (
    <DashboardLayout title="Employees" subtitle="Manage your organization's workforce">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Employees"
          value={loading ? "--" : `${total}`}
          icon={Users}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <StatCard
          label="Active"
          value={
            loading ? "--" : `${employees.filter((e) => e.status === "ACTIVE").length}`
          }
          icon={Users}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="On Probation"
          value={
            loading
              ? "--"
              : `${employees.filter((e) => e.status === "PROBATION").length}`
          }
          icon={Users}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Departments"
          value={
            loading
              ? "--"
              : `${new Set(employees.map((e) => e.departmentId).filter(Boolean)).size}`
          }
          icon={Building2}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
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
                  : "No employee data is available yet. Convert candidates from Recruitment to add employees."
              }
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Employee</TH>
                      <TH>Code</TH>
                      <TH>Department</TH>
                      <TH>Designation</TH>
                      <TH>Joined</TH>
                      <TH>Status</TH>
                      <TH className="w-[100px]">Actions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {filtered.map((emp) => (
                      <tr
                        key={emp.id}
                        className="border-t border-slate-100 transition-colors hover:bg-slate-50/50"
                      >
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
                              <p className="text-xs text-slate-400">
                                {emp.email ?? "—"}
                              </p>
                            </div>
                          </div>
                        </TD>
                        <TD>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">
                            {emp.employeeCode}
                          </span>
                        </TD>
                        <TD>{getDepartmentName(emp)}</TD>
                        <TD>{emp.designation ?? "—"}</TD>
                        <TD>
                          {emp.joiningDate
                            ? new Date(emp.joiningDate).toLocaleDateString()
                            : "—"}
                        </TD>
                        <TD>
                          <Badge variant={statusBadge[emp.status] ?? "outline"}>
                            {emp.status}
                          </Badge>
                        </TD>
                        <TD>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(emp)}
                              aria-label="Edit"
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-rose-600"
                              onClick={() => openDelete(emp)}
                              aria-label="Delete"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-500">
                    Page {page} of {totalPages} ({total} employees)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasPrev}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft size={16} /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasNext}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Employee Modal */}
      <Modal
        open={modalOpen === "edit"}
        onClose={closeModal}
        title="Edit Employee"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmitEdit();
          }}
        >
          <FormField label="Employee code">
            <Input value={formEmployeeCode} disabled className="bg-slate-50" />
          </FormField>
          <FormField label="Full name" required>
            <Input
              value={formFullName}
              onChange={(e) => setFormFullName(e.target.value)}
              placeholder="John Doe"
            />
          </FormField>
          <FormField label="Designation" required>
            <Input
              value={formDesignation}
              onChange={(e) => setFormDesignation(e.target.value)}
              placeholder="e.g. Software Engineer"
            />
          </FormField>
          <FormField label="Department">
            <Select value={formDepartmentId || "none"} onValueChange={(v) => setFormDepartmentId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Salary (optional)">
            <Input
              type="text"
              value={formSalary}
              onChange={(e) => setFormSalary(e.target.value)}
              placeholder="Optional"
            />
          </FormField>
          {formError && (
            <p className="mb-4 text-sm text-rose-600">{formError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={formSubmitting}>
              {formSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation Modal */}
      <Modal
        open={modalOpen === "delete"}
        onClose={closeModal}
        title="Delete Employee"
      >
        {deleteEmployee && (
          <>
            <p className="mb-4 text-sm text-slate-600">
              Are you sure you want to remove <strong>{deleteEmployee.fullName}</strong> (
              {deleteEmployee.employeeCode})? This will mark the employee as inactive.
            </p>
            {formError && (
              <p className="mb-4 text-sm text-rose-600">{formError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => void handleDelete()}
                disabled={formSubmitting}
              >
                {formSubmitting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </DashboardLayout>
  );
}
