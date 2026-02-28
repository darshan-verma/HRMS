"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Timer,
  RefreshCw,
  Plus,
  Clock,
  Sunrise,
  Sunset,
  Inbox,
  AlertCircle,
  Users,
  RotateCw,
  FileEdit,
  LayoutGrid,
  ShieldCheck,
  Eye,
  Pencil,
  Copy,
  PowerOff,
  Power,
  CheckCircle,
  XCircle,
  Loader2,
  Search
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

const ORG_ID = "seed-org";
const ACTOR_ROLE = "HR_ADMIN";
const ACTOR_USER_ID = "seed-user";

type Shift = {
  id: string;
  name: string;
  code?: string | null;
  startMinute: number;
  endMinute: number;
  graceMinutes: number;
  breakDurationMinutes?: number;
  breakPaid?: boolean;
  weeklyOffPattern?: number[] | null;
  earlyLeaveToleranceMinutes?: number;
  halfDayThresholdMinutes?: number;
  overtimeEligible?: boolean;
  overtimeMultiplier?: string | null;
  minWorkingHoursMinutes?: number | null;
  status: string;
  _count?: { assignments: number };
};

type Stats = {
  totalShifts: number;
  assignedCount: number;
  activeRotations: number;
  pendingRequests: number;
};

type Assignment = {
  id: string;
  employeeId: string;
  shiftId: string;
  assignmentType: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  employee?: { id: string; fullName: string; employeeCode: string };
  shift?: { id: string; name: string; code?: string | null };
};

type Rotation = {
  id: string;
  name: string;
  rotationType: string;
  shiftOrder: string[];
  status: string;
  _count?: { assignments: number };
};

type ChangeRequest = {
  id: string;
  employeeId: string;
  fromShiftId?: string | null;
  toShiftId: string;
  forDate: string;
  reason?: string | null;
  status: string;
  employee?: { id: string; fullName: string; employeeCode: string };
  fromShift?: { id: string; name: string } | null;
  toShift?: { id: string; name: string };
};

type CompliancePolicy = {
  id?: string;
  maxHoursPerWeek?: number;
  minRestHoursBetweenShifts?: string | number;
  maxOvertimeHoursPerMonth?: string | number;
  nightShiftStartHour?: number | null;
  nightShiftEndHour?: number | null;
  maxConsecutiveNightShifts?: number | null;
};

type EmployeeOption = { id: string; fullName: string; employeeCode: string };
type DepartmentOption = { id: string; name: string };

function minutesToTime(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${min.toString().padStart(2, "0")} ${period}`;
}

function minutesToDuration(start: number, end: number) {
  const diff = end > start ? end - start : 1440 - start + end;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function filterEmployeesBySearch(
  list: { id: string; fullName: string; employeeCode: string }[],
  search: string
): { id: string; fullName: string; employeeCode: string }[] {
  if (!search.trim()) return list;
  const q = search.trim().toLowerCase();
  return list.filter(
    (e) =>
      e.fullName.toLowerCase().includes(q) ||
      (e.employeeCode && e.employeeCode.toLowerCase().includes(q))
  );
}

export default function ShiftsPage() {
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [compliance, setCompliance] = useState<CompliancePolicy | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"templates" | "assignments" | "rotations" | "change-requests" | "compliance">("templates");

  const [createShiftOpen, setCreateShiftOpen] = useState(false);
  const [editShiftId, setEditShiftId] = useState<string | null>(null);
  const [viewShiftId, setViewShiftId] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [createRotationOpen, setCreateRotationOpen] = useState(false);
  const [assignRotationOpen, setAssignRotationOpen] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [approveRequestId, setApproveRequestId] = useState<string | null>(null);
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [deactivateConfirmShiftId, setDeactivateConfirmShiftId] = useState<string | null>(null);
  const [activateConfirmShiftId, setActivateConfirmShiftId] = useState<string | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formStartMinute, setFormStartMinute] = useState(540);
  const [formEndMinute, setFormEndMinute] = useState(1080);
  const [formGrace, setFormGrace] = useState(15);
  const [formBreakMin, setFormBreakMin] = useState(0);
  const [formBreakPaid, setFormBreakPaid] = useState(false);
  const [formWeeklyOff, setFormWeeklyOff] = useState<number[]>([]);
  const [formEarlyLeave, setFormEarlyLeave] = useState(0);
  const [formHalfDay, setFormHalfDay] = useState(240);
  const [formOtEligible, setFormOtEligible] = useState(false);
  const [formOtMultiplier, setFormOtMultiplier] = useState<string>("");
  const [formMinHours, setFormMinHours] = useState<string>("");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [assignType, setAssignType] = useState<"INDIVIDUAL" | "DEPARTMENT" | "BULK">("INDIVIDUAL");
  const [assignShiftId, setAssignShiftId] = useState("");
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assignDepartmentId, setAssignDepartmentId] = useState("");
  const [assignEmployeeIds, setAssignEmployeeIds] = useState<string[]>([]);
  const [assignEffectiveFrom, setAssignEffectiveFrom] = useState("");
  const [assignEffectiveTo, setAssignEffectiveTo] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const [rotationName, setRotationName] = useState("");
  const [rotationType, setRotationType] = useState<"WEEKLY" | "MONTHLY">("WEEKLY");
  const [rotationShiftOrder, setRotationShiftOrder] = useState<string[]>([]);
  const [rotationSubmitting, setRotationSubmitting] = useState(false);

  const [rotAssignEmployeeId, setRotAssignEmployeeId] = useState("");
  const [rotAssignRotationId, setRotAssignRotationId] = useState("");
  const [rotAssignFrom, setRotAssignFrom] = useState("");
  const [rotAssignSubmitting, setRotAssignSubmitting] = useState(false);

  const [compMaxHours, setCompMaxHours] = useState("48");
  const [compRestHours, setCompRestHours] = useState("8");
  const [compMaxOt, setCompMaxOt] = useState("50");
  const [compNightStart, setCompNightStart] = useState("");
  const [compNightEnd, setCompNightEnd] = useState("");
  const [compConsecutiveNights, setCompConsecutiveNights] = useState("");
  const [compSubmitting, setCompSubmitting] = useState(false);

  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateShiftId, setDuplicateShiftId] = useState<string | null>(null);

  const [assignEmployeeSearch, setAssignEmployeeSearch] = useState("");
  const [rotAssignEmployeeSearch, setRotAssignEmployeeSearch] = useState("");

  const queryBase = useMemo(() => new URLSearchParams({ orgId: ORG_ID, actorRole: ACTOR_ROLE }).toString(), []);

  const loadStats = useCallback(async () => {
    const res = await fetch(`/api/v1/shifts/stats?${queryBase}`);
    if (res.ok) setStats((await res.json()) as Stats);
  }, [queryBase]);

  const loadShifts = useCallback(async () => {
    const res = await fetch(`/api/v1/shifts?${queryBase}&status=all`);
    if (res.ok) setShifts((await res.json()) as Shift[]);
    else setError(await res.text());
  }, [queryBase]);

  const loadAssignments = useCallback(async () => {
    const res = await fetch(`/api/v1/shifts/assignments?${queryBase}`);
    if (res.ok) {
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } else {
      setAssignments([]);
    }
  }, [queryBase]);

  const loadRotations = useCallback(async () => {
    const res = await fetch(`/api/v1/shifts/rotations?${queryBase}&status=all`);
    if (res.ok) setRotations((await res.json()) as Rotation[]);
  }, [queryBase]);

  const loadChangeRequests = useCallback(async () => {
    const res = await fetch(`/api/v1/shifts/change-requests?${queryBase}&status=all`);
    if (res.ok) setChangeRequests((await res.json()) as ChangeRequest[]);
  }, [queryBase]);

  const loadCompliance = useCallback(async () => {
    const res = await fetch(`/api/v1/shifts/compliance?${queryBase}`);
    if (res.ok) {
      const data = (await res.json()) as CompliancePolicy;
      if (data && typeof data === "object") {
        setCompliance(data);
        setCompMaxHours(String(data.maxHoursPerWeek ?? 48));
        setCompRestHours(String(data.minRestHoursBetweenShifts ?? 8));
        setCompMaxOt(String(data.maxOvertimeHoursPerMonth ?? 50));
        setCompNightStart(data.nightShiftStartHour != null ? String(data.nightShiftStartHour) : "");
        setCompNightEnd(data.nightShiftEndHour != null ? String(data.nightShiftEndHour) : "");
        setCompConsecutiveNights(data.maxConsecutiveNightShifts != null ? String(data.maxConsecutiveNightShifts) : "");
      }
    }
  }, [queryBase]);

  const loadEmployees = useCallback(async () => {
    const res = await fetch(`/api/v1/employees?${queryBase}&page=1&pageSize=100`);
    if (res.ok) {
      const data = (await res.json()) as { items?: { id: string; fullName: string; employeeCode: string }[] };
      const items = Array.isArray(data?.items) ? data.items : [];
      setEmployees(items);
    } else {
      setEmployees([]);
    }
  }, [queryBase]);

  const loadDepartments = useCallback(async () => {
    const res = await fetch(`/api/v1/departments?${queryBase}`);
    if (res.ok) setDepartments((await res.json()) as DepartmentOption[]);
  }, [queryBase]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([
      loadStats(),
      loadShifts(),
      loadAssignments(),
      loadRotations(),
      loadChangeRequests(),
      loadCompliance(),
      loadEmployees(),
      loadDepartments()
    ]);
    setLoading(false);
  }, [
    loadStats,
    loadShifts,
    loadAssignments,
    loadRotations,
    loadChangeRequests,
    loadCompliance,
    loadEmployees,
    loadDepartments
  ]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Refetch assignments when user switches to Assignments tab so new assignments from Templates tab show up
  useEffect(() => {
    if (activeTab === "assignments") void loadAssignments();
  }, [activeTab, loadAssignments]);

  const openCreateShift = () => {
    setFormName("");
    setFormCode("");
    setFormStartMinute(540);
    setFormEndMinute(1080);
    setFormGrace(15);
    setFormBreakMin(0);
    setFormBreakPaid(false);
    setFormWeeklyOff([]);
    setFormEarlyLeave(0);
    setFormHalfDay(240);
    setFormOtEligible(false);
    setFormOtMultiplier("");
    setFormMinHours("");
    setFormStatus("ACTIVE");
    setFormError("");
    setCreateShiftOpen(true);
  };

  const openViewShift = (s: Shift) => {
    setEditShiftId(null);
    setViewShiftId(s.id);
    setFormName(s.name);
    setFormCode(s.code ?? "");
    setFormStartMinute(s.startMinute);
    setFormEndMinute(s.endMinute);
    setFormGrace(s.graceMinutes);
    setFormBreakMin(s.breakDurationMinutes ?? 0);
    setFormBreakPaid(s.breakPaid ?? false);
    setFormWeeklyOff(Array.isArray(s.weeklyOffPattern) ? [...s.weeklyOffPattern] : []);
    setFormEarlyLeave(s.earlyLeaveToleranceMinutes ?? 0);
    setFormHalfDay(s.halfDayThresholdMinutes ?? 240);
    setFormOtEligible(s.overtimeEligible ?? false);
    setFormOtMultiplier(s.overtimeMultiplier ?? "");
    setFormMinHours(s.minWorkingHoursMinutes != null ? String(s.minWorkingHoursMinutes) : "");
    setFormStatus((s.status as "ACTIVE" | "INACTIVE") || "ACTIVE");
    setFormError("");
  };

  const openEditShift = (s: Shift) => {
    setViewShiftId(null);
    setEditShiftId(s.id);
    setFormName(s.name);
    setFormCode(s.code ?? "");
    setFormStartMinute(s.startMinute);
    setFormEndMinute(s.endMinute);
    setFormGrace(s.graceMinutes);
    setFormBreakMin(s.breakDurationMinutes ?? 0);
    setFormBreakPaid(s.breakPaid ?? false);
    setFormWeeklyOff(Array.isArray(s.weeklyOffPattern) ? [...s.weeklyOffPattern] : []);
    setFormEarlyLeave(s.earlyLeaveToleranceMinutes ?? 0);
    setFormHalfDay(s.halfDayThresholdMinutes ?? 240);
    setFormOtEligible(s.overtimeEligible ?? false);
    setFormOtMultiplier(s.overtimeMultiplier ?? "");
    setFormMinHours(s.minWorkingHoursMinutes != null ? String(s.minWorkingHoursMinutes) : "");
    setFormStatus((s.status as "ACTIVE" | "INACTIVE") || "ACTIVE");
    setFormError("");
  };

  const submitCreateOrUpdateShift = async () => {
    setFormError("");
    if (!formName.trim()) {
      setFormError("Shift name is required.");
      return;
    }
    setFormSubmitting(true);
    try {
      if (editShiftId) {
        const res = await fetch(`/api/v1/shifts/${editShiftId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId: ORG_ID,
            actorRole: ACTOR_ROLE,
            actorUserId: ACTOR_USER_ID,
            shiftId: editShiftId,
            name: formName,
            code: formCode || undefined,
            startMinute: formStartMinute,
            endMinute: formEndMinute,
            graceMinutes: formGrace,
            breakDurationMinutes: formBreakMin,
            breakPaid: formBreakPaid,
            weeklyOffPattern: formWeeklyOff.length ? formWeeklyOff : undefined,
            earlyLeaveToleranceMinutes: formEarlyLeave,
            halfDayThresholdMinutes: formHalfDay,
            overtimeEligible: formOtEligible,
            overtimeMultiplier: formOtMultiplier ? Number(formOtMultiplier) : null,
            minWorkingHoursMinutes: formMinHours ? Number(formMinHours) : null,
            status: formStatus
          })
        });
        if (!res.ok) throw new Error(await res.text());
        setEditShiftId(null);
      } else {
        const res = await fetch("/api/v1/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId: ORG_ID,
            actorRole: ACTOR_ROLE,
            actorUserId: ACTOR_USER_ID,
            name: formName,
            code: formCode || undefined,
            startMinute: formStartMinute,
            endMinute: formEndMinute,
            graceMinutes: formGrace,
            breakDurationMinutes: formBreakMin,
            breakPaid: formBreakPaid,
            weeklyOffPattern: formWeeklyOff.length ? formWeeklyOff : undefined,
            earlyLeaveToleranceMinutes: formEarlyLeave,
            halfDayThresholdMinutes: formHalfDay,
            overtimeEligible: formOtEligible,
            overtimeMultiplier: formOtMultiplier ? Number(formOtMultiplier) : undefined,
            minWorkingHoursMinutes: formMinHours ? Number(formMinHours) : undefined,
            status: formStatus
          })
        });
        if (!res.ok) throw new Error(await res.text());
      }
      setCreateShiftOpen(false);
      await loadShifts();
      await loadStats();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save shift");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateShiftId || !duplicateName.trim()) return;
    setFormSubmitting(true);
    try {
      const res = await fetch("/api/v1/shifts/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: ACTOR_ROLE,
          actorUserId: ACTOR_USER_ID,
          shiftId: duplicateShiftId,
          newName: duplicateName
        })
      });
      if (!res.ok) throw new Error(await res.text());
      setDuplicateShiftId(null);
      setDuplicateName("");
      await loadShifts();
      await loadStats();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Duplicate failed");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeactivate = (shiftId: string) => {
    setDeactivateConfirmShiftId(shiftId);
  };

  const performDeactivate = async () => {
    if (!deactivateConfirmShiftId) return;
    setConfirmSubmitting(true);
    try {
      const res = await fetch(`/api/v1/shifts/${deactivateConfirmShiftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: ORG_ID, actorRole: ACTOR_ROLE, shiftId: deactivateConfirmShiftId, status: "INACTIVE" })
      });
      if (!res.ok) throw new Error(await res.text());
      await loadShifts();
      await loadStats();
      setDeactivateConfirmShiftId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deactivate failed");
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const handleActivate = (shiftId: string) => {
    setActivateConfirmShiftId(shiftId);
  };

  const performActivate = async () => {
    if (!activateConfirmShiftId) return;
    setConfirmSubmitting(true);
    try {
      const res = await fetch(`/api/v1/shifts/${activateConfirmShiftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: ORG_ID, actorRole: ACTOR_ROLE, shiftId: activateConfirmShiftId, status: "ACTIVE" })
      });
      if (!res.ok) throw new Error(await res.text());
      await loadShifts();
      await loadStats();
      setActivateConfirmShiftId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Activate failed");
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const openAssignModal = () => {
    setAssignType("INDIVIDUAL");
    setAssignShiftId(shifts.length ? shifts[0].id : "");
    setAssignEmployeeId("");
    setAssignDepartmentId("");
    setAssignEmployeeIds([]);
    setAssignEmployeeSearch("");
    setAssignEffectiveFrom(new Date().toISOString().slice(0, 16));
    setAssignEffectiveTo("");
    setFormError("");
    setAssignModalOpen(true);
    // Ensure dropdowns are populated when opening (e.g. when opened from Assignments tab or before initial load finished)
    void loadEmployees();
    void loadDepartments();
  };

  const submitAssign = async () => {
    if (!assignShiftId) return;
    if (assignType === "INDIVIDUAL" && !assignEmployeeId) {
      setFormError("Select an employee.");
      return;
    }
    if (assignType === "DEPARTMENT" && !assignDepartmentId) {
      setFormError("Select a department.");
      return;
    }
    if (assignType === "BULK" && assignEmployeeIds.length === 0) {
      setFormError("Add at least one employee.");
      return;
    }
    setFormError("");
    const payload: Record<string, unknown> = {
      orgId: ORG_ID,
      actorRole: ACTOR_ROLE,
      actorUserId: ACTOR_USER_ID,
      shiftId: assignShiftId,
      assignmentType: assignType,
      effectiveFrom: new Date(assignEffectiveFrom).toISOString()
    };
    if (assignEffectiveTo) payload.effectiveTo = new Date(assignEffectiveTo).toISOString();
    if (assignType === "INDIVIDUAL") payload.employeeId = assignEmployeeId;
    if (assignType === "DEPARTMENT") payload.departmentId = assignDepartmentId;
    if (assignType === "BULK") payload.employeeIds = assignEmployeeIds;
    setAssignSubmitting(true);
    try {
      const res = await fetch("/api/v1/shifts/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      setAssignModalOpen(false);
      await loadAssignments();
      await loadStats();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setAssignSubmitting(false);
    }
  };

  const submitCreateRotation = async () => {
    if (!rotationName.trim() || rotationShiftOrder.length === 0) {
      setFormError("Name and at least one shift in order are required.");
      return;
    }
    setRotationSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/v1/shifts/rotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: ACTOR_ROLE,
          actorUserId: ACTOR_USER_ID,
          name: rotationName,
          rotationType,
          shiftOrder: rotationShiftOrder
        })
      });
      if (!res.ok) throw new Error(await res.text());
      setCreateRotationOpen(false);
      setRotationName("");
      setRotationShiftOrder([]);
      await loadRotations();
      await loadStats();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Create rotation failed");
    } finally {
      setRotationSubmitting(false);
    }
  };

  const submitAssignRotation = async () => {
    if (!rotAssignEmployeeId || !rotAssignRotationId || !rotAssignFrom) return;
    setRotAssignSubmitting(true);
    try {
      const res = await fetch("/api/v1/shifts/rotations/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: ACTOR_ROLE,
          actorUserId: ACTOR_USER_ID,
          employeeId: rotAssignEmployeeId,
          rotationId: rotAssignRotationId,
          effectiveFrom: new Date(rotAssignFrom + "T00:00:00").toISOString()
        })
      });
      if (!res.ok) throw new Error(await res.text());
      setAssignRotationOpen(false);
      await loadStats();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Assign rotation failed");
    } finally {
      setRotAssignSubmitting(false);
    }
  };

  const submitCompliance = async () => {
    setCompSubmitting(true);
    try {
      const res = await fetch("/api/v1/shifts/compliance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: ACTOR_ROLE,
          actorUserId: ACTOR_USER_ID,
          maxHoursPerWeek: Number(compMaxHours) || 48,
          minRestHoursBetweenShifts: Number(compRestHours) || 8,
          maxOvertimeHoursPerMonth: Number(compMaxOt) || 50,
          nightShiftStartHour: compNightStart ? Number(compNightStart) : null,
          nightShiftEndHour: compNightEnd ? Number(compNightEnd) : null,
          maxConsecutiveNightShifts: compConsecutiveNights ? Number(compConsecutiveNights) : null
        })
      });
      if (!res.ok) throw new Error(await res.text());
      setComplianceOpen(false);
      await loadCompliance();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Save compliance failed");
    } finally {
      setCompSubmitting(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/v1/shifts/change-requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: ACTOR_ROLE,
          actorUserId: ACTOR_USER_ID,
          action: "approve"
        })
      });
      if (!res.ok) throw new Error(await res.text());
      setApproveRequestId(null);
      await loadChangeRequests();
      await loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/v1/shifts/change-requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ORG_ID,
          actorRole: ACTOR_ROLE,
          actorUserId: ACTOR_USER_ID,
          action: "reject",
          rejectionReason: rejectReason || "Rejected"
        })
      });
      if (!res.ok) throw new Error(await res.text());
      setRejectRequestId(null);
      setRejectReason("");
      await loadChangeRequests();
      await loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    }
  };

  const toggleWeeklyOff = (day: number) => {
    setFormWeeklyOff((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  };

  const addShiftToRotationOrder = (shiftId: string) => {
    if (!shiftId || rotationShiftOrder.includes(shiftId)) return;
    setRotationShiftOrder((prev) => [...prev, shiftId]);
  };
  const removeShiftFromOrder = (index: number) => {
    setRotationShiftOrder((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <DashboardLayout title="Shift Management" subtitle="Industry-grade shifts, assignments, rotations, and compliance">
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          compact
          label="Total Shift Types"
          value={loading ? "--" : String(stats?.totalShifts ?? 0)}
          icon={Timer}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <StatCard
          compact
          label="Employees Assigned"
          value={loading ? "--" : String(stats?.assignedCount ?? 0)}
          icon={Users}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          compact
          label="Active Rotations"
          value={loading ? "--" : String(stats?.activeRotations ?? 0)}
          icon={RotateCw}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
        <StatCard
          compact
          label="Pending Shift Change Requests"
          value={loading ? "--" : String(stats?.pendingRequests ?? 0)}
          icon={FileEdit}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      <div className="mt-6 flex gap-2 border-b border-slate-200">
        {(
          [
            { id: "templates", label: "Shift Templates", icon: LayoutGrid },
            { id: "assignments", label: "Assignments", icon: Users },
            { id: "rotations", label: "Rotations", icon: RotateCw },
            { id: "change-requests", label: "Change Requests", icon: FileEdit },
            { id: "compliance", label: "Compliance Report", icon: ShieldCheck }
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === id
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "templates" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Shift Templates</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={openCreateShift}>
                <Plus size={14} /> Create Shift
              </Button>
              <Button size="sm" onClick={openAssignModal}>
                <Users size={14} /> Assign Shift
              </Button>
              <Button variant="outline" size="sm" onClick={() => loadAll()}>
                <RefreshCw size={14} /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : shifts.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No shifts configured"
                description="Create your first shift to define work schedules, overtime rules, and compliance."
              />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Name</TH>
                      <TH>Code</TH>
                      <TH>Start</TH>
                      <TH>End</TH>
                      <TH>Hours</TH>
                      <TH>OT</TH>
                      <TH>Assigned</TH>
                      <TH>Status</TH>
                      <TH>Actions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {shifts.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                        <TD className="font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-slate-400" />
                            {row.name}
                          </div>
                        </TD>
                        <TD className="text-slate-600">{row.code ?? "—"}</TD>
                        <TD>
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            {minutesToTime(row.startMinute)}
                          </span>
                        </TD>
                        <TD>
                          <span className="rounded bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                            {minutesToTime(row.endMinute)}
                          </span>
                        </TD>
                        <TD className="font-medium">{minutesToDuration(row.startMinute, row.endMinute)}</TD>
                        <TD>
                          {row.overtimeEligible ? (
                            <Badge variant="success">{row.overtimeMultiplier ?? "1.5"}x</Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TD>
                        <TD>{row._count?.assignments ?? 0}</TD>
                        <TD>
                          <Badge variant={row.status === "ACTIVE" ? "success" : "outline"}>{row.status}</Badge>
                        </TD>
                        <TD>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openViewShift(row)}
                              className="h-8 w-8 p-0"
                              title="View"
                            >
                              <Eye size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditShift(row)}
                              className="h-8 w-8 p-0"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDuplicateShiftId(row.id);
                                setDuplicateName(`${row.name} (Copy)`);
                              }}
                              className="h-8 w-8 p-0"
                              title="Duplicate"
                            >
                              <Copy size={14} />
                            </Button>
                            {row.status === "ACTIVE" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeactivate(row.id)}
                                className="h-8 w-8 p-0 text-amber-600"
                                title="Deactivate"
                              >
                                <PowerOff size={14} />
                              </Button>
                            )}
                            {row.status !== "ACTIVE" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleActivate(row.id)}
                                className="h-8 w-8 p-0 text-emerald-600"
                                title="Activate"
                              >
                                <Power size={14} />
                              </Button>
                            )}
                          </div>
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "assignments" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Shift Assignments</CardTitle>
            <Button size="sm" onClick={openAssignModal}>
              <Plus size={14} /> Assign
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : assignments.length === 0 ? (
              <EmptyState icon={Users} title="No assignments" description="Assign shifts to employees or departments." />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Employee</TH>
                      <TH>Shift</TH>
                      <TH>Type</TH>
                      <TH>Effective From</TH>
                      <TH>Effective To</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {assignments.map((a) => (
                      <tr key={a.id} className="border-t border-slate-100">
                        <TD className="font-medium">
                          {a.employee?.fullName ?? a.employeeId} ({a.employee?.employeeCode ?? ""})
                        </TD>
                        <TD>{a.shift?.name ?? a.shiftId}</TD>
                        <TD>
                          <Badge variant="info">{a.assignmentType}</Badge>
                        </TD>
                        <TD>{new Date(a.effectiveFrom).toLocaleDateString()}</TD>
                        <TD>{a.effectiveTo ? new Date(a.effectiveTo).toLocaleDateString() : "—"}</TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "rotations" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Shift Rotations</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setCreateRotationOpen(true)}>
                <Plus size={14} /> Create Rotation
              </Button>
              <Button size="sm" onClick={() => setAssignRotationOpen(true)}>
                <Users size={14} /> Assign to Employee
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : rotations.length === 0 ? (
              <EmptyState icon={RotateCw} title="No rotations" description="Create weekly or monthly shift rotations." />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Name</TH>
                      <TH>Type</TH>
                      <TH>Shifts in Order</TH>
                      <TH>Assigned</TH>
                      <TH>Status</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {rotations.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <TD className="font-medium">{r.name}</TD>
                        <TD>
                          <Badge variant="info">{r.rotationType}</Badge>
                        </TD>
                        <TD className="text-slate-600">
                          {Array.isArray(r.shiftOrder)
                            ? r.shiftOrder
                                .map((id) => shifts.find((s) => s.id === id)?.name ?? id)
                                .join(" → ")
                            : "—"}
                        </TD>
                        <TD>{r._count?.assignments ?? 0}</TD>
                        <TD>
                          <Badge variant={r.status === "ACTIVE" ? "success" : "outline"}>{r.status}</Badge>
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "change-requests" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Shift Change Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : changeRequests.length === 0 ? (
              <EmptyState icon={FileEdit} title="No change requests" description="Employees can request shift swaps; approve or reject here." />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Employee</TH>
                      <TH>From → To</TH>
                      <TH>For Date</TH>
                      <TH>Status</TH>
                      <TH>Actions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {changeRequests.map((req) => (
                      <tr key={req.id} className="border-t border-slate-100">
                        <TD className="font-medium">{req.employee?.fullName ?? req.employeeId}</TD>
                        <TD>
                          {(req.fromShift?.name ?? "—")} → {req.toShift?.name ?? req.toShiftId}
                        </TD>
                        <TD>{new Date(req.forDate).toLocaleDateString()}</TD>
                        <TD>
                          <Badge
                            variant={
                              req.status === "APPROVED" ? "success" : req.status === "REJECTED" ? "danger" : "warning"
                            }
                          >
                            {req.status}
                          </Badge>
                        </TD>
                        <TD>
                          {req.status === "PENDING" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setApproveRequestId(req.id)}
                                className="text-emerald-600"
                              >
                                <CheckCircle size={14} /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRejectRequestId(req.id)}
                                className="text-rose-600"
                              >
                                <XCircle size={14} /> Reject
                              </Button>
                            </div>
                          )}
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "compliance" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Compliance & Legal</CardTitle>
            <Button size="sm" onClick={() => setComplianceOpen(true)}>
              <Pencil size={14} /> Edit Policy
            </Button>
          </CardHeader>
          <CardContent>
            {compliance ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-700">Max working hours per week</p>
                  <p className="text-2xl font-semibold text-slate-900">{compliance.maxHoursPerWeek ?? 48}h</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-700">Min rest between shifts</p>
                  <p className="text-2xl font-semibold text-slate-900">{String(compliance.minRestHoursBetweenShifts ?? 8)}h</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-700">Max overtime per month</p>
                  <p className="text-2xl font-semibold text-slate-900">{String(compliance.maxOvertimeHoursPerMonth ?? 50)}h</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-700">Night shift policy</p>
                  <p className="text-slate-600">
                    {compliance.nightShiftStartHour != null && compliance.nightShiftEndHour != null
                      ? `${compliance.nightShiftStartHour}:00 – ${compliance.nightShiftEndHour}:00, max ${compliance.maxConsecutiveNightShifts ?? "—"} consecutive nights`
                      : "Not set"}
                  </p>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={ShieldCheck}
                title="No compliance policy"
                description="Set max hours, rest periods, and night shift rules for Indian HRMS."
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit/View Shift SlideOver */}
      <SlideOver
        open={createShiftOpen || !!editShiftId || !!viewShiftId}
        onClose={() => {
          setCreateShiftOpen(false);
          setEditShiftId(null);
          setViewShiftId(null);
        }}
        title={viewShiftId ? "View Shift" : editShiftId ? "Edit Shift" : "Create Shift"}
        className="max-w-xl"
      >
        {formError && (
          <p className="mb-4 text-sm text-rose-600">{formError}</p>
        )}
        <FormField label="Shift Name" required>
          <Input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Morning Shift"
            disabled={!!viewShiftId}
          />
        </FormField>
        <FormField label="Shift Code">
          <Input
            value={formCode}
            onChange={(e) => setFormCode(e.target.value)}
            placeholder="e.g. GEN-01"
            disabled={!!viewShiftId}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start (minutes from midnight)" required>
            <Input
              type="number"
              min={0}
              max={1439}
              value={formStartMinute}
              onChange={(e) => setFormStartMinute(Number(e.target.value))}
              disabled={!!viewShiftId}
            />
          </FormField>
          <FormField label="End (minutes from midnight)" required>
            <Input
              type="number"
              min={0}
              max={1439}
              value={formEndMinute}
              onChange={(e) => setFormEndMinute(Number(e.target.value))}
              disabled={!!viewShiftId}
            />
          </FormField>
        </div>
        <p className="mb-2 text-xs text-slate-500">
          Preview: {minutesToTime(formStartMinute)} – {minutesToTime(formEndMinute)} ({minutesToDuration(formStartMinute, formEndMinute)})
        </p>
        <FormField label="Grace period (min)">
          <Input type="number" min={0} value={formGrace} onChange={(e) => setFormGrace(Number(e.target.value))} disabled={!!viewShiftId} />
        </FormField>
        <FormField label="Break duration (min)">
          <Input type="number" min={0} value={formBreakMin} onChange={(e) => setFormBreakMin(Number(e.target.value))} disabled={!!viewShiftId} />
        </FormField>
        <FormField label="Break paid">
          <Select value={formBreakPaid ? "yes" : "no"} onValueChange={(v) => setFormBreakPaid(v === "yes")} disabled={!!viewShiftId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="no">Unpaid</SelectItem>
              <SelectItem value="yes">Paid</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Weekly off (select days)">
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => !viewShiftId && toggleWeeklyOff(i)}
                className={`rounded border px-2 py-1 text-xs ${formWeeklyOff.includes(i) ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 bg-slate-50"} ${viewShiftId ? "cursor-default opacity-70" : ""}`}
              >
                {d}
              </button>
            ))}
          </div>
        </FormField>
        <FormField label="Early leave tolerance (min)">
          <Input type="number" min={0} value={formEarlyLeave} onChange={(e) => setFormEarlyLeave(Number(e.target.value))} disabled={!!viewShiftId} />
        </FormField>
        <FormField label="Half-day threshold (min)">
          <Input type="number" min={0} value={formHalfDay} onChange={(e) => setFormHalfDay(Number(e.target.value))} disabled={!!viewShiftId} />
        </FormField>
        <FormField label="Overtime eligible">
          <Select value={formOtEligible ? "yes" : "no"} onValueChange={(v) => setFormOtEligible(v === "yes")} disabled={!!viewShiftId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="no">No</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        {formOtEligible && (
          <FormField label="Overtime multiplier (e.g. 1.5 or 2)">
            <Input value={formOtMultiplier} onChange={(e) => setFormOtMultiplier(e.target.value)} placeholder="1.5" disabled={!!viewShiftId} />
          </FormField>
        )}
        <FormField label="Min working hours (min, optional)">
          <Input value={formMinHours} onChange={(e) => setFormMinHours(e.target.value)} placeholder="480" disabled={!!viewShiftId} />
        </FormField>
        {editShiftId && (
          <FormField label="Status">
            <Select value={formStatus} onValueChange={(v) => setFormStatus(v as "ACTIVE" | "INACTIVE")} disabled={!!viewShiftId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        )}
        {viewShiftId && <FormField label="Status"><p className="text-slate-700">{formStatus}</p></FormField>}
        {!viewShiftId && (
          <div className="mt-4 flex gap-2">
          <Button onClick={submitCreateOrUpdateShift} disabled={formSubmitting}>
            {formSubmitting ? <Loader2 className="animate-spin" size={16} /> : null}
            {editShiftId ? "Update" : "Create"}
          </Button>
          <Button variant="outline" onClick={() => { setCreateShiftOpen(false); setEditShiftId(null); setViewShiftId(null); }}>
            Cancel
          </Button>
        </div>
        )}
      </SlideOver>

      {/* Duplicate modal */}
      <Modal
        open={!!duplicateShiftId}
        onClose={() => setDuplicateShiftId(null)}
        title="Duplicate Shift"
      >
        <FormField label="New shift name" required>
          <Input value={duplicateName} onChange={(e) => setDuplicateName(e.target.value)} placeholder="e.g. Morning Shift (Copy)" />
        </FormField>
        {formError && <p className="text-sm text-rose-600">{formError}</p>}
        <div className="mt-4 flex gap-2">
          <Button onClick={handleDuplicate} disabled={formSubmitting}>Duplicate</Button>
          <Button variant="outline" onClick={() => setDuplicateShiftId(null)}>Cancel</Button>
        </div>
      </Modal>

      {/* Assign Shift Modal */}
      <Modal open={assignModalOpen} onClose={() => setAssignModalOpen(false)} title="Assign Shift" className="max-w-md">
        <FormField label="Assignment type">
          <Select value={assignType} onValueChange={(v) => setAssignType(v as "INDIVIDUAL" | "DEPARTMENT" | "BULK")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="INDIVIDUAL">Individual</SelectItem>
              <SelectItem value="DEPARTMENT">Department</SelectItem>
              <SelectItem value="BULK">Bulk (multiple employees)</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Shift" required>
          <Select value={assignShiftId} onValueChange={setAssignShiftId}>
            <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
            <SelectContent>
              {shifts.filter((s) => s.status === "ACTIVE").map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        {assignType === "INDIVIDUAL" && (
          <FormField label="Employee" required>
            <Select value={assignEmployeeId} onValueChange={setAssignEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <div
                  className="sticky top-0 border-b border-slate-100 bg-white p-2"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search by name or code..."
                      value={assignEmployeeSearch}
                      onChange={(e) => setAssignEmployeeSearch(e.target.value)}
                      className="h-8 pl-8 text-sm"
                    />
                  </div>
                </div>
                {filterEmployeesBySearch(employees, assignEmployeeSearch).map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {employees.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">No employees found. Add employees from the Employees page first.</p>
            )}
            {employees.length > 0 && filterEmployeesBySearch(employees, assignEmployeeSearch).length === 0 && (
              <p className="mt-1 text-xs text-slate-500">No employees match your search.</p>
            )}
          </FormField>
        )}
        {assignType === "DEPARTMENT" && (
          <FormField label="Department" required>
            <Select value={assignDepartmentId} onValueChange={setAssignDepartmentId}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}
        {assignType === "BULK" && (
          <FormField label="Employees (add to list)">
            <Select
              value=""
              onValueChange={(v) => {
                if (v && !assignEmployeeIds.includes(v)) setAssignEmployeeIds((prev) => [...prev, v]);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Add employee" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <div
                  className="sticky top-0 border-b border-slate-100 bg-white p-2"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search by name or code..."
                      value={assignEmployeeSearch}
                      onChange={(e) => setAssignEmployeeSearch(e.target.value)}
                      className="h-8 pl-8 text-sm"
                    />
                  </div>
                </div>
                {filterEmployeesBySearch(
                  employees.filter((e) => !assignEmployeeIds.includes(e.id)),
                  assignEmployeeSearch
                ).map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ul className="mt-2 space-y-1">
              {assignEmployeeIds.map((id) => {
                const e = employees.find((x) => x.id === id);
                return (
                  <li key={id} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-sm">
                    {e?.fullName ?? id}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAssignEmployeeIds((prev) => prev.filter((x) => x !== id))}
                    >
                      Remove
                    </Button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1 text-xs text-slate-500">Selected: {assignEmployeeIds.length} employees</p>
          </FormField>
        )}
        <FormField label="Effective from" required>
          <Input type="datetime-local" value={assignEffectiveFrom} onChange={(e) => setAssignEffectiveFrom(e.target.value)} />
        </FormField>
        <FormField label="Effective to (optional)">
          <Input type="datetime-local" value={assignEffectiveTo} onChange={(e) => setAssignEffectiveTo(e.target.value)} />
        </FormField>
        {formError && <p className="text-sm text-rose-600">{formError}</p>}
        <div className="mt-4 flex gap-2">
          <Button onClick={submitAssign} disabled={assignSubmitting}>Assign</Button>
          <Button variant="outline" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* Create Rotation Modal */}
      <Modal open={createRotationOpen} onClose={() => setCreateRotationOpen(false)} title="Create Rotation" className="max-w-md">
        <FormField label="Rotation name" required>
          <Input value={rotationName} onChange={(e) => setRotationName(e.target.value)} placeholder="e.g. Weekly Rotating" />
        </FormField>
        <FormField label="Type">
          <Select value={rotationType} onValueChange={(v) => setRotationType(v as "WEEKLY" | "MONTHLY")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Shift order (add in sequence)">
          <Select value="" onValueChange={addShiftToRotationOrder}>
            <SelectTrigger><SelectValue placeholder="Add shift to order" /></SelectTrigger>
            <SelectContent>
              {shifts.filter((s) => s.status === "ACTIVE").map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ul className="mt-2 space-y-1">
            {rotationShiftOrder.map((id, i) => (
              <li key={id} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-sm">
                {i + 1}. {shifts.find((s) => s.id === id)?.name ?? id}
                <Button variant="ghost" size="sm" onClick={() => removeShiftFromOrder(i)}>Remove</Button>
              </li>
            ))}
          </ul>
        </FormField>
        {formError && <p className="text-sm text-rose-600">{formError}</p>}
        <div className="mt-4 flex gap-2">
          <Button onClick={submitCreateRotation} disabled={rotationSubmitting}>Create</Button>
          <Button variant="outline" onClick={() => setCreateRotationOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* Assign Rotation Modal */}
      <Modal open={assignRotationOpen} onClose={() => { setAssignRotationOpen(false); setRotAssignEmployeeSearch(""); }} title="Assign Rotation to Employee">
        <FormField label="Employee" required>
          <Select value={rotAssignEmployeeId} onValueChange={setRotAssignEmployeeId}>
            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <div
                className="sticky top-0 border-b border-slate-100 bg-white p-2"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search by name or code..."
                    value={rotAssignEmployeeSearch}
                    onChange={(e) => setRotAssignEmployeeSearch(e.target.value)}
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>
              {filterEmployeesBySearch(employees, rotAssignEmployeeSearch).map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {employees.length > 0 && filterEmployeesBySearch(employees, rotAssignEmployeeSearch).length === 0 && (
            <p className="mt-1 text-xs text-slate-500">No employees match your search.</p>
          )}
        </FormField>
        <FormField label="Rotation" required>
          <Select value={rotAssignRotationId} onValueChange={setRotAssignRotationId}>
            <SelectTrigger><SelectValue placeholder="Select rotation" /></SelectTrigger>
            <SelectContent>
              {rotations.filter((r) => r.status === "ACTIVE").map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Effective from" required>
          <Input type="date" value={rotAssignFrom} onChange={(e) => setRotAssignFrom(e.target.value)} />
        </FormField>
        {formError && <p className="text-sm text-rose-600">{formError}</p>}
        <div className="mt-4 flex gap-2">
          <Button onClick={submitAssignRotation} disabled={rotAssignSubmitting}>Assign</Button>
          <Button variant="outline" onClick={() => setAssignRotationOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* Deactivate shift confirmation */}
      <AlertDialog open={!!deactivateConfirmShiftId} onOpenChange={(open) => !open && setDeactivateConfirmShiftId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate shift?</AlertDialogTitle>
            <AlertDialogDescription>
              This shift will no longer be available for new assignments. Existing assignments will remain until their end date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmSubmitting}>Cancel</AlertDialogCancel>
            <Button variant="danger" onClick={performDeactivate} disabled={confirmSubmitting}>
              {confirmSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deactivate"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate shift confirmation */}
      <AlertDialog open={!!activateConfirmShiftId} onOpenChange={(open) => !open && setActivateConfirmShiftId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate shift?</AlertDialogTitle>
            <AlertDialogDescription>
              This shift will be available again for new assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmSubmitting}>Cancel</AlertDialogCancel>
            <Button variant="success" onClick={performActivate} disabled={confirmSubmitting}>
              {confirmSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Compliance SlideOver */}
      <SlideOver open={complianceOpen} onClose={() => setComplianceOpen(false)} title="Compliance Policy" className="max-w-md">
        <FormField label="Max hours per week">
          <Input type="number" min={1} value={compMaxHours} onChange={(e) => setCompMaxHours(e.target.value)} />
        </FormField>
        <FormField label="Min rest between shifts (hours)">
          <Input type="number" min={0} step={0.5} value={compRestHours} onChange={(e) => setCompRestHours(e.target.value)} />
        </FormField>
        <FormField label="Max overtime per month (hours)">
          <Input type="number" min={0} value={compMaxOt} onChange={(e) => setCompMaxOt(e.target.value)} />
        </FormField>
        <FormField label="Night shift start hour (0-23)">
          <Input type="number" min={0} max={23} value={compNightStart} onChange={(e) => setCompNightStart(e.target.value)} placeholder="e.g. 22" />
        </FormField>
        <FormField label="Night shift end hour (0-23)">
          <Input type="number" min={0} max={23} value={compNightEnd} onChange={(e) => setCompNightEnd(e.target.value)} placeholder="e.g. 6" />
        </FormField>
        <FormField label="Max consecutive night shifts">
          <Input type="number" min={1} value={compConsecutiveNights} onChange={(e) => setCompConsecutiveNights(e.target.value)} placeholder="e.g. 5" />
        </FormField>
        {formError && <p className="text-sm text-rose-600">{formError}</p>}
        <div className="mt-4 flex gap-2">
          <Button onClick={submitCompliance} disabled={compSubmitting}>Save</Button>
          <Button variant="outline" onClick={() => setComplianceOpen(false)}>Cancel</Button>
        </div>
      </SlideOver>

      {/* Approve confirm */}
      <Modal open={!!approveRequestId} onClose={() => setApproveRequestId(null)} title="Approve shift change request?">
        <p className="mb-4 text-sm text-slate-600">This will apply the requested shift override for the given date.</p>
        <div className="flex gap-2">
          <Button onClick={() => approveRequestId && handleApproveRequest(approveRequestId)}>Approve</Button>
          <Button variant="outline" onClick={() => setApproveRequestId(null)}>Cancel</Button>
        </div>
      </Modal>

      {/* Reject with reason */}
      <Modal open={!!rejectRequestId} onClose={() => { setRejectRequestId(null); setRejectReason(""); }} title="Reject shift change request">
        <FormField label="Reason (optional)">
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason" />
        </FormField>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="text-rose-600" onClick={() => rejectRequestId && handleRejectRequest(rejectRequestId)}>Reject</Button>
          <Button variant="outline" onClick={() => setRejectRequestId(null)}>Cancel</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
