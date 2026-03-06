"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Wallet,
  RefreshCw,
  Calculator,
  DollarSign,
  FileText,
  TrendingUp,
  Inbox,
  AlertCircle,
  Plus,
  Play,
  Download,
  Eye,
  Loader2,
  Search,
  ChevronDown,
  History,
  RotateCcw,
  Lock,
  CheckCircle,
  Unlock
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/contexts/auth-context";
import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal, FormField, Input, SlideOver, Textarea } from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

const ORG_ID = "seed-org";

type PayrollRun = {
  id: string;
  period: string;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  summary?: { generated?: number } | null;
};

type SalaryStructure = {
  id: string;
  employeeId: string;
  basic: string;
  hra: string;
  specialAllowance: string;
  otherAllowance?: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  epfApplicable?: boolean;
  esiApplicable?: boolean;
  professionalTax?: string;
  employee?: { id: string; employeeCode: string; fullName: string };
};

type PayslipItem = {
  id: string;
  employeeId: string;
  period: string;
  grossAmount: string;
  deductionAmount: string;
  netAmount: string;
  taxDeduction: string;
  epfDeduction: string;
  esiDeduction: string;
  employee?: { id: string; employeeCode: string; fullName: string };
};

type RunSummary = {
  payrollRunId: string;
  period: string;
  status: string;
  totalEmployeesProcessed: number;
  grossEarnings: number;
  totalDeductions: number;
  employerContributions: number;
  netPayable: number;
  costToCompanyTotal: number;
  compliance: {
    pfTotal: number;
    pfEmployee: number;
    pfEmployer: number;
    esiTotal: number;
    esiEmployee: number;
    esiEmployer: number;
    tdsTotal: number;
    professionalTax: number | null;
  };
};

type EmployeeOption = { id: string; fullName: string; employeeCode: string };

const runStatusBadge: Record<string, "success" | "danger" | "warning" | "info"> = {
  DRAFT: "info",
  CALCULATING: "warning",
  AWAITING_APPROVAL: "warning",
  APPROVED: "success",
  COMPLETED: "success",
  LOCKED: "success",
  REOPENED: "info",
  FAILED: "danger",
  PROCESSING: "warning",
  PENDING: "info"
};

export default function PayrollUiPage() {
  const { user } = useAuth();
  const actorRole = (user?.role ?? "").toUpperCase() || "EMPLOYEE";
  const actorUserId = user?.id;
  const canPayrollWrite = hasPermission(actorRole, PERMISSIONS.PAYROLL_WRITE);

  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"runs" | "structures">("runs");

  // Modals
  const [createRunOpen, setCreateRunOpen] = useState(false);
  const [addStructureOpen, setAddStructureOpen] = useState(false);
  const [payslipsOpen, setPayslipsOpen] = useState<PayrollRun | null>(null);
  const [payslipsList, setPayslipsList] = useState<PayslipItem[]>([]);
  const [payslipsLoading, setPayslipsLoading] = useState(false);

  // Create run form
  const [runPeriod, setRunPeriod] = useState("");
  const [runSubmitting, setRunSubmitting] = useState(false);
  const [runFormError, setRunFormError] = useState("");

  // Add structure form
  const [structEmployeeId, setStructEmployeeId] = useState("");
  const [structBasic, setStructBasic] = useState("");
  const [structHra, setStructHra] = useState("");
  const [structSpecialAllowance, setStructSpecialAllowance] = useState("");
  const [structOtherAllowance, setStructOtherAllowance] = useState("0");
  const [structEpf, setStructEpf] = useState(true);
  const [structEsi, setStructEsi] = useState(false);
  const [structProfessionalTax, setStructProfessionalTax] = useState("0");
  const [structEffectiveFrom, setStructEffectiveFrom] = useState("");
  const [structSubmitting, setStructSubmitting] = useState(false);
  const [structFormError, setStructFormError] = useState("");

  // Employee dropdown (add structure modal)
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  // Generate
  const [generatingRunId, setGeneratingRunId] = useState<string | null>(null);
  const [lifecycleActionRunId, setLifecycleActionRunId] = useState<string | null>(null);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [runSummaryLoading, setRunSummaryLoading] = useState(false);

  // Salary structure: filter, search, slide-overs
  const [structureStatusFilter, setStructureStatusFilter] = useState<"all" | "active" | "future" | "past">("all");
  const [structureSearch, setStructureSearch] = useState("");
  const [viewStructureId, setViewStructureId] = useState<string | null>(null);
  const [viewStructureDetail, setViewStructureDetail] = useState<SalaryStructure | null>(null);
  const [viewStructureLoading, setViewStructureLoading] = useState(false);
  const [historyEmployeeId, setHistoryEmployeeId] = useState<string | null>(null);
  const [reviseStructure, setReviseStructure] = useState<SalaryStructure | null>(null);
  const [reviseBasic, setReviseBasic] = useState("");
  const [reviseHra, setReviseHra] = useState("");
  const [reviseSpecialAllowance, setReviseSpecialAllowance] = useState("");
  const [reviseOtherAllowance, setReviseOtherAllowance] = useState("0");
  const [reviseProfessionalTax, setReviseProfessionalTax] = useState("0");
  const [reviseEpf, setReviseEpf] = useState(true);
  const [reviseEsi, setReviseEsi] = useState(false);
  const [reviseEffectiveFrom, setReviseEffectiveFrom] = useState("");
  const [reviseReason, setReviseReason] = useState("");
  const [reviseSubmitting, setReviseSubmitting] = useState(false);
  const [reviseFormError, setReviseFormError] = useState("");

  // Tax calculator
  const [taxIncome, setTaxIncome] = useState("1250000");
  const [taxRegime, setTaxRegime] = useState<"OLD" | "NEW">("NEW");
  const [taxResult, setTaxResult] = useState<string | null>(null);

  const query = useMemo(
    () => new URLSearchParams({ orgId: ORG_ID, actorRole }).toString(),
    [actorRole]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [runsRes, structRes] = await Promise.all([
        fetch(`/api/v1/payroll/runs?${query}`, { cache: "no-store" }),
        fetch(`/api/v1/payroll/salary-structures?${query}`, { cache: "no-store" })
      ]);
      if (runsRes.ok) setRuns((await runsRes.json()) as PayrollRun[]);
      else setRuns([]);
      if (structRes.ok) setStructures((await structRes.json()) as SalaryStructure[]);
      else setStructures([]);
      if (!runsRes.ok || !structRes.ok) setError("Failed to load payroll resources.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    const q = new URLSearchParams({
      orgId: ORG_ID,
      actorRole,
      page: "1",
      pageSize: "100"
    }).toString();
    try {
      const res = await fetch(`/api/v1/employees?${q}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { items: Array<{ id: string; fullName: string; employeeCode: string }> };
        const items = Array.isArray(data.items) ? data.items : [];
        setEmployees(items.map((e) => ({ id: e.id, fullName: e.fullName, employeeCode: e.employeeCode })));
      } else {
        setEmployees([]);
      }
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (addStructureOpen) void loadEmployees();
  }, [addStructureOpen, loadEmployees]);

  useEffect(() => {
    if (!employeeDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(e.target as Node)) {
        setEmployeeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [employeeDropdownOpen]);

  const filteredEmployees = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(term) || e.employeeCode.toLowerCase().includes(term)
    );
  }, [employees, employeeSearch]);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === structEmployeeId),
    [employees, structEmployeeId]
  );

  function getStructureStatus(s: SalaryStructure): "active" | "future" | "past" {
    const from = new Date(s.effectiveFrom).getTime();
    const to = s.effectiveTo ? new Date(s.effectiveTo).getTime() : null;
    const now = Date.now();
    if (to !== null && to < now) return "past";
    if (from > now) return "future";
    return "active";
  }

  const filteredStructures = useMemo(() => {
    let list = structures;
    if (structureStatusFilter !== "all") {
      list = list.filter((s) => getStructureStatus(s) === structureStatusFilter);
    }
    const term = structureSearch.trim().toLowerCase();
    if (term) {
      list = list.filter((s) => {
        const name = s.employee?.fullName?.toLowerCase() ?? "";
        const code = s.employee?.employeeCode?.toLowerCase() ?? "";
        return name.includes(term) || code.includes(term);
      });
    }
    return list;
  }, [structures, structureStatusFilter, structureSearch]);

  async function handleCreateRun() {
    const period = runPeriod.trim();
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      setRunFormError("Period must be YYYY-MM (e.g. 2026-03).");
      return;
    }
    setRunFormError("");
    setRunSubmitting(true);
    try {
      const res = await fetch("/api/v1/payroll/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: actorRole,
          period
        })
      });
      if (!res.ok) {
        const err = (await res.json()).message ?? "Failed to create payroll run";
        setRunFormError(err);
        return;
      }
      setCreateRunOpen(false);
      setRunPeriod("");
      await loadData();
    } finally {
      setRunSubmitting(false);
    }
  }

  async function handleGenerateRun(run: PayrollRun) {
    if (run.status !== "DRAFT" && run.status !== "PENDING") return;
    setGeneratingRunId(run.id);
    try {
      const res = await fetch("/api/v1/payroll/runs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: actorRole,
          payrollRunId: run.id,
          regime: "NEW",
          runInline: true
        })
      });
      if (!res.ok) {
        const err = (await res.json()).message ?? "Generate failed";
        setError(err);
      } else {
        await loadData();
      }
    } finally {
      setGeneratingRunId(null);
    }
  }

  async function fetchRunSummary(payrollRunId: string) {
    setRunSummaryLoading(true);
    setRunSummary(null);
    try {
      const q = new URLSearchParams({ orgId: ORG_ID, actorRole: actorRole }).toString();
      const res = await fetch(`/api/v1/payroll/runs/${payrollRunId}/summary?${q}`, {
        cache: "no-store"
      });
      if (res.ok) {
        const data = (await res.json()) as RunSummary;
        setRunSummary(data);
      }
    } finally {
      setRunSummaryLoading(false);
    }
  }

  async function handleApproveRun(run: PayrollRun) {
    setLifecycleActionRunId(run.id);
    try {
      const res = await fetch(`/api/v1/payroll/runs/${run.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: actorRole,
          actorUserId: actorUserId,
          payrollRunId: run.id
        })
      });
      if (!res.ok) {
        const err = (await res.json()).message ?? "Approve failed";
        setError(err);
      } else {
        await loadData();
        if (payslipsOpen?.id === run.id) fetchRunSummary(run.id);
      }
    } finally {
      setLifecycleActionRunId(null);
    }
  }

  async function handleLockRun(run: PayrollRun) {
    setLifecycleActionRunId(run.id);
    try {
      const res = await fetch(`/api/v1/payroll/runs/${run.id}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: actorRole,
          actorUserId: actorUserId,
          payrollRunId: run.id
        })
      });
      if (!res.ok) {
        const err = (await res.json()).message ?? "Lock failed";
        setError(err);
      } else {
        await loadData();
        if (payslipsOpen?.id === run.id) setRunSummary(null);
      }
    } finally {
      setLifecycleActionRunId(null);
    }
  }

  async function handleReopenRun(run: PayrollRun) {
    setLifecycleActionRunId(run.id);
    try {
      const res = await fetch(`/api/v1/payroll/runs/${run.id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: actorRole,
          actorUserId: actorUserId,
          payrollRunId: run.id
        })
      });
      if (!res.ok) {
        const err = (await res.json()).message ?? "Reopen failed";
        setError(err);
      } else {
        await loadData();
      }
    } finally {
      setLifecycleActionRunId(null);
    }
  }

  function handleBankExport(run: PayrollRun) {
    const params = new URLSearchParams({
      orgId: ORG_ID,
      actorRole: actorRole,
      payrollRunId: run.id
    });
    window.open(`/api/v1/payroll/runs/bank-export?${params}`, "_blank", "noopener");
  }

  async function openPayslips(run: PayrollRun) {
    setPayslipsOpen(run);
    setPayslipsLoading(true);
    setRunSummary(null);
    try {
      const [payslipsRes, summaryRes] = await Promise.all([
        fetch(
          `/api/v1/payroll/payslips?${new URLSearchParams({
            orgId: ORG_ID,
            actorRole: actorRole,
            payrollRunId: run.id
          })}`,
          { cache: "no-store" }
        ),
        fetch(
          `/api/v1/payroll/runs/${run.id}/summary?${new URLSearchParams({
            orgId: ORG_ID,
            actorRole: actorRole
          })}`,
          { cache: "no-store" }
        )
      ]);
      if (payslipsRes.ok) {
        const list = (await payslipsRes.json()) as PayslipItem[];
        setPayslipsList(Array.isArray(list) ? list : []);
      } else {
        setPayslipsList([]);
      }
      if (summaryRes.ok) {
        const sum = (await summaryRes.json()) as RunSummary;
        setRunSummary(sum);
      }
    } finally {
      setPayslipsLoading(false);
    }
  }

  async function openViewStructure(id: string) {
    setViewStructureId(id);
    setViewStructureDetail(null);
    setViewStructureLoading(true);
    try {
      const q = new URLSearchParams({ orgId: ORG_ID, actorRole: actorRole }).toString();
      const res = await fetch(`/api/v1/payroll/salary-structures/${id}?${q}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as SalaryStructure;
        setViewStructureDetail(data);
      }
    } finally {
      setViewStructureLoading(false);
    }
  }

  function openHistory(employeeId: string) {
    setHistoryEmployeeId(employeeId);
  }

  function openRevise(s: SalaryStructure) {
    setReviseStructure(s);
    setReviseBasic(s.basic);
    setReviseHra(s.hra);
    setReviseSpecialAllowance(s.specialAllowance);
    setReviseOtherAllowance(s.otherAllowance ?? "0");
    setReviseProfessionalTax(s.professionalTax ?? "0");
    setReviseEpf(s.epfApplicable ?? true);
    setReviseEsi(s.esiApplicable ?? false);
    setReviseEffectiveFrom("");
    setReviseReason("");
    setReviseFormError("");
  }

  const reviseCtc = useMemo(() => {
    const b = parseFloat(reviseBasic) || 0;
    const h = parseFloat(reviseHra) || 0;
    const s = parseFloat(reviseSpecialAllowance) || 0;
    const o = parseFloat(reviseOtherAllowance) || 0;
    return (b + h + s + o) * 12;
  }, [reviseBasic, reviseHra, reviseSpecialAllowance, reviseOtherAllowance]);

  async function handleReviseSubmit() {
    if (!reviseStructure) return;
    if (!reviseEffectiveFrom.trim() || !reviseReason.trim()) {
      setReviseFormError("Effective From and Reason for revision are required.");
      return;
    }
    const basic = parseFloat(reviseBasic);
    const hra = parseFloat(reviseHra);
    const sa = parseFloat(reviseSpecialAllowance);
    if (isNaN(basic) || isNaN(hra) || isNaN(sa) || basic < 0 || hra < 0 || sa < 0) {
      setReviseFormError("Basic, HRA and Special Allowance must be valid non-negative numbers.");
      return;
    }
    const effectiveFrom = new Date(reviseEffectiveFrom);
    if (isNaN(effectiveFrom.getTime())) {
      setReviseFormError("Invalid effective from date.");
      return;
    }
    setReviseFormError("");
    setReviseSubmitting(true);
    try {
      const res = await fetch("/api/v1/payroll/salary-structures/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: actorRole,
          structureId: reviseStructure.id,
          effectiveFrom: effectiveFrom.toISOString(),
          basic: String(basic),
          hra: String(hra),
          specialAllowance: String(sa),
          otherAllowance: String(parseFloat(reviseOtherAllowance) || 0),
          professionalTax: String(parseFloat(reviseProfessionalTax) || 0),
          epfApplicable: reviseEpf,
          esiApplicable: reviseEsi,
          reasonForRevision: reviseReason.trim()
        })
      });
      if (!res.ok) {
        const err = (await res.json()).message ?? "Revision failed";
        setReviseFormError(err);
        return;
      }
      setReviseStructure(null);
      await loadData();
    } finally {
      setReviseSubmitting(false);
    }
  }

  async function handleAddStructure() {
    if (!structEmployeeId || !structBasic || !structHra || !structSpecialAllowance || !structEffectiveFrom) {
      setStructFormError("Employee, Basic, HRA, Special Allowance, and Effective From are required.");
      return;
    }
    const basic = parseFloat(structBasic);
    const hra = parseFloat(structHra);
    const sa = parseFloat(structSpecialAllowance);
    if (isNaN(basic) || isNaN(hra) || isNaN(sa) || basic < 0 || hra < 0 || sa < 0) {
      setStructFormError("Numeric fields must be valid non-negative numbers.");
      return;
    }
    setStructFormError("");
    setStructSubmitting(true);
    try {
      const effectiveFrom = new Date(structEffectiveFrom);
      if (isNaN(effectiveFrom.getTime())) {
        setStructFormError("Invalid effective from date.");
        return;
      }
      const res = await fetch("/api/v1/payroll/salary-structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: actorRole,
          employeeId: structEmployeeId,
          basic: String(basic),
          hra: String(hra),
          specialAllowance: String(sa),
          otherAllowance: structOtherAllowance ? String(parseFloat(structOtherAllowance) || 0) : "0",
          epfApplicable: structEpf,
          esiApplicable: structEsi,
          professionalTax: structProfessionalTax ? String(parseFloat(structProfessionalTax) || 0) : "0",
          effectiveFrom: effectiveFrom.toISOString()
        })
      });
      if (!res.ok) {
        const err = (await res.json()).message ?? "Failed to add salary structure";
        setStructFormError(err);
        return;
      }
      setAddStructureOpen(false);
      resetStructForm();
      await loadData();
    } finally {
      setStructSubmitting(false);
    }
  }

  function resetStructForm() {
    setStructEmployeeId("");
    setStructBasic("");
    setStructHra("");
    setStructSpecialAllowance("");
    setStructOtherAllowance("0");
    setStructEpf(true);
    setStructEsi(false);
    setStructProfessionalTax("0");
    setStructEffectiveFrom("");
    setStructFormError("");
    setEmployeeSearch("");
    setEmployeeDropdownOpen(false);
  }

  async function calculateTax() {
    const res = await fetch("/api/v1/payroll/calculate-tax", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorRole: actorRole,
        annualTaxableIncome: taxIncome,
        regime: taxRegime
      })
    });
    const data = await res.json();
    setTaxResult(res.ok ? JSON.stringify(data, null, 2) : (await res.text()) || "Error");
  }

  const totalBasic = useMemo(
    () => structures.reduce((sum, s) => sum + Number(s.basic), 0),
    [structures]
  );
  const completedRuns = useMemo(() => runs.filter((r) => r.status === "COMPLETED").length, [runs]);

  const tabs = [
    { key: "runs" as const, label: "Payroll Runs", count: runs.length },
    { key: "structures" as const, label: "Salary Structures", count: structures.length }
  ];

  return (
    <DashboardLayout title="Payroll" subtitle="Manage salary structures, tax calculations, and payroll runs">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          compact
          label="Payroll Runs"
          value={loading ? "--" : `${runs.length}`}
          icon={Wallet}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <StatCard
          compact
          label="Salary Structures"
          value={loading ? "--" : `${structures.length}`}
          icon={FileText}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
        <StatCard
          compact
          label="Total Basic"
          value={loading ? "--" : `₹${totalBasic.toLocaleString()}`}
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          compact
          label="Completed Runs"
          value={loading ? "--" : `${completedRuns}`}
          icon={TrendingUp}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Tax calculator card */}
      <Card className="mt-6">
        <CardContent className="pt-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Calculator size={16} /> Tax Calculator (India)
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Annual taxable income (₹)
              </label>
              <Input
                type="text"
                value={taxIncome}
                onChange={(e) => setTaxIncome(e.target.value)}
                placeholder="1250000"
                className="h-9 w-40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Regime</label>
              <Select value={taxRegime} onValueChange={(v) => setTaxRegime(v as "OLD" | "NEW")}>
                <SelectTrigger className="h-9 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="OLD">Old</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="block text-sm font-medium text-slate-700 mb-1 h-5" aria-hidden="true">
                {" "}
              </span>
              <Button size="sm" className="h-9" onClick={calculateTax}>
                Calculate
              </Button>
            </div>
          </div>
          {taxResult && (
            <pre className="mt-3 overflow-auto rounded-lg border border-slate-200 bg-slate-900 p-3 text-xs text-slate-100 max-h-32">
              {taxResult}
            </pre>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap gap-2">
        {canPayrollWrite && (
          <>
            <Button size="sm" onClick={() => setCreateRunOpen(true)}>
              <Plus size={14} /> New payroll run
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAddStructureOpen(true);
                resetStructForm();
              }}
            >
              <Plus size={14} /> Add salary structure
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="mt-6 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                activeTab === tab.key ? "bg-brand-50 text-brand-700" : "bg-slate-200 text-slate-500"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="pt-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : activeTab === "runs" ? (
            runs.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No payroll runs"
                description="Create a payroll run to process salary for a period."
              />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Period</TH>
                      <TH>Status</TH>
                      <TH>Started</TH>
                      <TH>Completed</TH>
                      <TH className="text-right">Actions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {runs.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                        <TD className="font-medium">{r.period}</TD>
                        <TD>
                          <Badge variant={runStatusBadge[r.status] ?? "outline"}>{r.status}</Badge>
                        </TD>
                        <TD>{new Date(r.startedAt).toLocaleString()}</TD>
                        <TD>{r.completedAt ? new Date(r.completedAt).toLocaleString() : "—"}</TD>
                        <TD className="text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPayslips(r)}
                              title="View payslips"
                            >
                              <Eye size={14} />
                            </Button>
                            {canPayrollWrite && (r.status === "DRAFT" || r.status === "PENDING") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleGenerateRun(r)}
                                disabled={generatingRunId === r.id}
                                title="Generate payslips"
                              >
                                {generatingRunId === r.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Play size={14} />
                                )}
                              </Button>
                            )}
                            {canPayrollWrite && r.status === "AWAITING_APPROVAL" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApproveRun(r)}
                                disabled={lifecycleActionRunId === r.id}
                                title="Approve payroll"
                              >
                                {lifecycleActionRunId === r.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <CheckCircle size={14} />
                                )}
                              </Button>
                            )}
                            {canPayrollWrite && (r.status === "APPROVED" || r.status === "COMPLETED") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleLockRun(r)}
                                disabled={lifecycleActionRunId === r.id}
                                title="Lock payroll"
                              >
                                {lifecycleActionRunId === r.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Lock size={14} />
                                )}
                              </Button>
                            )}
                            {canPayrollWrite && r.status === "LOCKED" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReopenRun(r)}
                                disabled={lifecycleActionRunId === r.id}
                                title="Reopen (restricted)"
                              >
                                {lifecycleActionRunId === r.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Unlock size={14} />
                                )}
                              </Button>
                            )}
                            {canPayrollWrite &&
                              ["AWAITING_APPROVAL", "APPROVED", "COMPLETED", "LOCKED"].includes(
                                r.status
                              ) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleBankExport(r)}
                                title="Bank export CSV"
                              >
                                <Download size={14} />
                              </Button>
                            )}
                          </div>
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )
          ) : structures.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No salary structures"
              description="Add salary structures for employees to run payroll."
            />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Filter:</span>
                  <Select
                    value={structureStatusFilter}
                    onValueChange={(v) => setStructureStatusFilter(v as "all" | "active" | "future" | "past")}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="future">Future</SelectItem>
                      <SelectItem value="past">Past</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-1 min-w-[200px] max-w-xs items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                  <Search size={14} className="shrink-0 text-slate-400" />
                  <input
                    type="text"
                    value={structureSearch}
                    onChange={(e) => setStructureSearch(e.target.value)}
                    placeholder="Search by employee name or code..."
                    className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Employee</TH>
                      <TH>Basic</TH>
                      <TH>HRA</TH>
                      <TH>Special Allowance</TH>
                      <TH>Effective From</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Actions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {filteredStructures.map((s) => {
                      const status = getStructureStatus(s);
                      return (
                        <tr key={s.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                          <TD>
                            {s.employee
                              ? `${s.employee.fullName} (${s.employee.employeeCode})`
                              : s.employeeId}
                          </TD>
                          <TD className="font-semibold text-slate-900">₹{Number(s.basic).toLocaleString()}</TD>
                          <TD>₹{Number(s.hra).toLocaleString()}</TD>
                          <TD>₹{Number(s.specialAllowance).toLocaleString()}</TD>
                          <TD>{new Date(s.effectiveFrom).toLocaleDateString()}</TD>
                          <TD>
                            {status === "active" && (
                              <Badge variant="success">Active</Badge>
                            )}
                            {status === "future" && (
                              <Badge variant="info">
                                Future ({new Date(s.effectiveFrom).toLocaleDateString()})
                              </Badge>
                            )}
                            {status === "past" && (
                              <Badge variant="outline">Past</Badge>
                            )}
                          </TD>
                          <TD className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openViewStructure(s.id)}
                                title="View"
                              >
                                <Eye size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openHistory(s.employeeId)}
                                title="History"
                              >
                                <History size={14} />
                              </Button>
                              {canPayrollWrite && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openRevise(s)}
                                  title="Revise"
                                >
                                  <RotateCcw size={14} />
                                </Button>
                              )}
                            </div>
                          </TD>
                        </tr>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
              {filteredStructures.length === 0 && (structureStatusFilter !== "all" || structureSearch.trim()) && (
                <p className="mt-3 text-center text-sm text-slate-500">No matching salary structures.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create payroll run modal */}
      <Modal open={createRunOpen} onClose={() => setCreateRunOpen(false)} title="New payroll run">
        <FormField label="Period (YYYY-MM)" required error={runFormError}>
          <Input
            type="text"
            value={runPeriod}
            onChange={(e) => setRunPeriod(e.target.value)}
            placeholder="2026-03"
          />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setCreateRunOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateRun} disabled={runSubmitting}>
            {runSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
            Create run
          </Button>
        </div>
      </Modal>

      {/* Add salary structure modal */}
      <Modal
        open={addStructureOpen}
        onClose={() => setAddStructureOpen(false)}
        title="Add salary structure"
        className="max-w-lg"
      >
        <FormField label="Employee" required>
          <div className="relative" ref={employeeDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setEmployeeDropdownOpen((o) => !o);
                if (!employeeDropdownOpen) setEmployeeSearch("");
              }}
              className="flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <span className={selectedEmployee ? "text-slate-900" : "text-slate-400"}>
                {selectedEmployee
                  ? `${selectedEmployee.fullName} (${selectedEmployee.employeeCode})`
                  : "Select employee"}
              </span>
              <ChevronDown size={16} className="shrink-0 opacity-50" />
            </button>
            {employeeDropdownOpen && (
              <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-100 p-2">
                  <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                    <Search size={14} className="shrink-0 text-slate-400" />
                    <input
                      type="text"
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      placeholder="Search by name or code..."
                      className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto p-1">
                  {employeesLoading ? (
                    <div className="flex items-center justify-center py-6 text-slate-500">
                      <Loader2 size={18} className="animate-spin" />
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="py-4 text-center text-sm text-slate-500">
                      {employees.length === 0
                        ? "No employees found. Add employees first."
                        : "No matching employees."}
                    </div>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setStructEmployeeId(emp.id);
                          setEmployeeDropdownOpen(false);
                          setEmployeeSearch("");
                        }}
                        className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 ${
                          structEmployeeId === emp.id ? "bg-brand-50 text-brand-800" : "text-slate-700"
                        }`}
                      >
                        {emp.fullName} <span className="text-slate-500">({emp.employeeCode})</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </FormField>
        <FormField label="Basic (₹)" required>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={structBasic}
            onChange={(e) => setStructBasic(e.target.value)}
            placeholder="50000"
          />
        </FormField>
        <FormField label="HRA (₹)" required>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={structHra}
            onChange={(e) => setStructHra(e.target.value)}
            placeholder="20000"
          />
        </FormField>
        <FormField label="Special Allowance (₹)" required>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={structSpecialAllowance}
            onChange={(e) => setStructSpecialAllowance(e.target.value)}
            placeholder="15000"
          />
        </FormField>
        <FormField label="Other Allowance (₹)">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={structOtherAllowance}
            onChange={(e) => setStructOtherAllowance(e.target.value)}
            placeholder="0"
          />
        </FormField>
        <FormField label="Professional Tax (₹)">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={structProfessionalTax}
            onChange={(e) => setStructProfessionalTax(e.target.value)}
            placeholder="0"
          />
        </FormField>
        <FormField label="Effective from" required>
          <Input
            type="date"
            value={structEffectiveFrom}
            onChange={(e) => setStructEffectiveFrom(e.target.value)}
          />
        </FormField>
        <div className="mb-4 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={structEpf}
              onChange={(e) => setStructEpf(e.target.checked)}
              className="rounded border-slate-300"
            />
            EPF applicable
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={structEsi}
              onChange={(e) => setStructEsi(e.target.checked)}
              className="rounded border-slate-300"
            />
            ESI applicable
          </label>
        </div>
        {structFormError && (
          <p className="mb-3 text-sm text-rose-600">{structFormError}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setAddStructureOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddStructure} disabled={structSubmitting}>
            {structSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
            Add structure
          </Button>
        </div>
      </Modal>

      {/* View payslips modal */}
      <Modal
        open={!!payslipsOpen}
        onClose={() => setPayslipsOpen(null)}
        title={payslipsOpen ? `Payslips — ${payslipsOpen.period}` : "Payslips"}
        className="max-w-4xl max-h-[85vh]"
      >
        {payslipsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            {runSummary && (
              <div className="mb-4 space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">
                    Financial summary
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500">Employees processed</p>
                      <p className="font-semibold text-slate-900">
                        {runSummary.totalEmployeesProcessed}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Gross earnings</p>
                      <p className="font-semibold text-slate-900">
                        ₹{runSummary.grossEarnings.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Total deductions</p>
                      <p className="font-semibold text-slate-900">
                        ₹{runSummary.totalDeductions.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Employer contributions</p>
                      <p className="font-semibold text-slate-900">
                        ₹{runSummary.employerContributions.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Net payable</p>
                      <p className="font-semibold text-emerald-700">
                        ₹{runSummary.netPayable.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Cost to company</p>
                      <p className="font-semibold text-slate-900">
                        ₹{runSummary.costToCompanyTotal.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-violet-50/30 p-4">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">
                    Compliance (India)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500">PF total</p>
                      <p className="font-semibold">₹{runSummary.compliance.pfTotal.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">ESI total</p>
                      <p className="font-semibold">₹{runSummary.compliance.esiTotal.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">TDS total</p>
                      <p className="font-semibold">₹{runSummary.compliance.tdsTotal.toLocaleString()}</p>
                    </div>
                    {runSummary.compliance.professionalTax != null && (
                      <div>
                        <p className="text-slate-500">Professional tax</p>
                        <p className="font-semibold">
                          ₹{runSummary.compliance.professionalTax.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {payslipsList.length === 0 ? (
              <p className="text-slate-500 text-sm">No payslips for this run.</p>
            ) : (
              <div className="overflow-auto max-h-[60vh] rounded-lg border border-slate-200">
            <Table>
              <THead>
                <tr>
                  <TH>Employee</TH>
                  <TH>Gross</TH>
                  <TH>Tax</TH>
                  <TH>EPF</TH>
                  <TH>ESI</TH>
                  <TH>Deductions</TH>
                  <TH>Net</TH>
                </tr>
              </THead>
              <TBody>
                {payslipsList.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <TD>
                      {p.employee
                        ? `${p.employee.fullName} (${p.employee.employeeCode})`
                        : p.employeeId}
                    </TD>
                    <TD>₹{Number(p.grossAmount).toLocaleString()}</TD>
                    <TD>₹{Number(p.taxDeduction).toLocaleString()}</TD>
                    <TD>₹{Number(p.epfDeduction).toLocaleString()}</TD>
                    <TD>₹{Number(p.esiDeduction).toLocaleString()}</TD>
                    <TD>₹{Number(p.deductionAmount).toLocaleString()}</TD>
                    <TD className="font-semibold">₹{Number(p.netAmount).toLocaleString()}</TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          </div>
            )}
          </>
        )}
      </Modal>

      {/* View salary structure slide-over */}
      <SlideOver
        open={!!viewStructureId}
        onClose={() => { setViewStructureId(null); setViewStructureDetail(null); }}
        title="Salary structure details"
      >
        {viewStructureLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : viewStructureDetail ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Employee</dt>
              <dd className="font-medium text-slate-900">
                {viewStructureDetail.employee
                  ? `${viewStructureDetail.employee.fullName} (${viewStructureDetail.employee.employeeCode})`
                  : viewStructureDetail.employeeId}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Basic</dt>
              <dd className="font-semibold">₹{Number(viewStructureDetail.basic).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-slate-500">HRA</dt>
              <dd>₹{Number(viewStructureDetail.hra).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Special Allowance</dt>
              <dd>₹{Number(viewStructureDetail.specialAllowance).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Other Allowance</dt>
              <dd>₹{Number(viewStructureDetail.otherAllowance ?? 0).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Professional Tax</dt>
              <dd>₹{Number(viewStructureDetail.professionalTax ?? 0).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-slate-500">CTC (annual)</dt>
              <dd className="font-semibold">
                ₹
                {(
                  (Number(viewStructureDetail.basic) +
                    Number(viewStructureDetail.hra) +
                    Number(viewStructureDetail.specialAllowance) +
                    Number(viewStructureDetail.otherAllowance ?? 0)) *
                  12
                ).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Effective from</dt>
              <dd>{new Date(viewStructureDetail.effectiveFrom).toLocaleDateString()}</dd>
            </div>
            {viewStructureDetail.effectiveTo && (
              <div>
                <dt className="text-slate-500">Effective to</dt>
                <dd>{new Date(viewStructureDetail.effectiveTo).toLocaleDateString()}</dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500">EPF / ESI</dt>
              <dd>
                {viewStructureDetail.epfApplicable ? "EPF ✓" : "EPF —"}{" "}
                {viewStructureDetail.esiApplicable ? "ESI ✓" : "ESI —"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-slate-500 text-sm">Structure not found.</p>
        )}
      </SlideOver>

      {/* History slide-over (all structures for one employee) */}
      <SlideOver
        open={!!historyEmployeeId}
        onClose={() => setHistoryEmployeeId(null)}
        title="Salary history"
      >
        {historyEmployeeId && (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <Table>
              <THead>
                <tr>
                  <TH>Basic</TH>
                  <TH>HRA</TH>
                  <TH>Special Allowance</TH>
                  <TH>From</TH>
                  <TH>To</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {structures
                  .filter((s) => s.employeeId === historyEmployeeId)
                  .map((s) => {
                    const status = getStructureStatus(s);
                    return (
                      <tr key={s.id} className="border-t border-slate-100">
                        <TD>₹{Number(s.basic).toLocaleString()}</TD>
                        <TD>₹{Number(s.hra).toLocaleString()}</TD>
                        <TD>₹{Number(s.specialAllowance).toLocaleString()}</TD>
                        <TD>{new Date(s.effectiveFrom).toLocaleDateString()}</TD>
                        <TD>{s.effectiveTo ? new Date(s.effectiveTo).toLocaleDateString() : "—"}</TD>
                        <TD>
                          {status === "active" && <Badge variant="success">Active</Badge>}
                          {status === "future" && <Badge variant="info">Future</Badge>}
                          {status === "past" && <Badge variant="outline">Past</Badge>}
                        </TD>
                      </tr>
                    );
                  })}
              </TBody>
            </Table>
          </div>
        )}
      </SlideOver>

      {/* Revise salary slide-over */}
      <SlideOver
        open={!!reviseStructure}
        onClose={() => setReviseStructure(null)}
        title="Revise salary structure"
      >
        {reviseStructure && (
          <>
            <p className="mb-4 text-sm text-slate-600">
              Current effective from:{" "}
              <strong>{new Date(reviseStructure.effectiveFrom).toLocaleDateString()}</strong>. Set the new
              effective from and revised components. The previous structure will be closed automatically.
            </p>
            <FormField label="Basic (₹)" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={reviseBasic}
                onChange={(e) => setReviseBasic(e.target.value)}
              />
            </FormField>
            <FormField label="HRA (₹)" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={reviseHra}
                onChange={(e) => setReviseHra(e.target.value)}
              />
            </FormField>
            <FormField label="Special Allowance (₹)" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={reviseSpecialAllowance}
                onChange={(e) => setReviseSpecialAllowance(e.target.value)}
              />
            </FormField>
            <FormField label="Other Allowance (₹)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={reviseOtherAllowance}
                onChange={(e) => setReviseOtherAllowance(e.target.value)}
              />
            </FormField>
            <FormField label="Professional Tax (₹)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={reviseProfessionalTax}
                onChange={(e) => setReviseProfessionalTax(e.target.value)}
              />
            </FormField>
            <div className="mb-4 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reviseEpf}
                  onChange={(e) => setReviseEpf(e.target.checked)}
                  className="rounded border-slate-300"
                />
                EPF applicable
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reviseEsi}
                  onChange={(e) => setReviseEsi(e.target.checked)}
                  className="rounded border-slate-300"
                />
                ESI applicable
              </label>
            </div>
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-500">CTC (annual)</p>
              <p className="text-lg font-semibold text-slate-900">₹{reviseCtc.toLocaleString()}</p>
            </div>
            <FormField label="New effective from" required>
              <Input
                type="date"
                value={reviseEffectiveFrom}
                onChange={(e) => setReviseEffectiveFrom(e.target.value)}
              />
            </FormField>
            <FormField label="Reason for revision" required error={reviseFormError}>
              <Textarea
                value={reviseReason}
                onChange={(e) => setReviseReason(e.target.value)}
                placeholder="e.g. Annual increment, promotion"
                rows={3}
              />
            </FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setReviseStructure(null)}>
                Cancel
              </Button>
              <Button onClick={handleReviseSubmit} disabled={reviseSubmitting}>
                {reviseSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                Save revision
              </Button>
            </div>
          </>
        )}
      </SlideOver>
    </DashboardLayout>
  );
}
