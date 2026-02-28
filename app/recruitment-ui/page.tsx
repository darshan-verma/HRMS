"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  UserPlus,
  RefreshCw,
  Briefcase,
  Users,
  Video,
  ArrowRightLeft,
  Plus,
  Inbox,
  CalendarPlus,
  Pencil
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal, FormField, Input, Textarea } from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "PART_TIME", label: "Part Time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" }
] as const;

const INTERVIEW_MODES = [
  { value: "VIDEO", label: "Video" },
  { value: "PHONE", label: "Phone" },
  { value: "ONSITE", label: "On-site" }
] as const;

type JobPosting = {
  id: string;
  title: string;
  department: string;
  employmentType: string;
  status: string;
  openings: number;
};

type Candidate = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  stage: string;
  status: string;
  source?: string | null;
  notes?: string | null;
  jobPosting: { id: string; title: string };
};

type Interview = {
  id: string;
  scheduledAt: string;
  interviewerName: string;
  mode: string;
  status: string;
  candidate: { fullName: string; email: string };
};

const ORG_ID = "seed-org";
const ACTOR_ROLE = "HR_ADMIN";

const jobStatusBadge: Record<string, "success" | "danger" | "warning" | "info"> = {
  OPEN: "success",
  CLOSED: "danger",
  DRAFT: "info",
  ON_HOLD: "warning"
};

const candidateStatusBadge: Record<string, "success" | "danger" | "warning" | "info"> = {
  ACTIVE: "info",
  CONVERTED: "success",
  REJECTED: "danger",
  WITHDRAWN: "warning"
};

const interviewStatusBadge: Record<string, "success" | "danger" | "warning" | "info"> = {
  SCHEDULED: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
  NO_SHOW: "warning"
};

const JOB_STATUSES = [
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
  { value: "DRAFT", label: "Draft" },
  { value: "ON_HOLD", label: "On Hold" }
] as const;

const CANDIDATE_STAGES = [
  { value: "APPLIED", label: "Applied" },
  { value: "SCREENING", label: "Screening" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "OFFER", label: "Offer" },
  { value: "HIRED", label: "Hired" }
] as const;

const CANDIDATE_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "CONVERTED", label: "Converted" }
] as const;

const INTERVIEW_STATUSES = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Show" }
] as const;

type ModalType = "job" | "candidate" | "interview" | "convert" | "edit-job" | "edit-candidate" | "edit-interview" | null;

export default function RecruitmentUiPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"jobs" | "candidates" | "interviews">("jobs");
  const [modalOpen, setModalOpen] = useState<ModalType>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);

  // Create/Edit Job form
  const [jobTitle, setJobTitle] = useState("");
  const [jobDepartment, setJobDepartment] = useState("");
  const [jobEmploymentType, setJobEmploymentType] = useState("FULL_TIME");
  const [jobOpenings, setJobOpenings] = useState(1);
  const [jobStatus, setJobStatus] = useState("OPEN");
  const [jobError, setJobError] = useState("");
  const [jobSubmitting, setJobSubmitting] = useState(false);

  // Add/Edit Candidate form
  const [candJobId, setCandJobId] = useState("");
  const [candFullName, setCandFullName] = useState("");
  const [candEmail, setCandEmail] = useState("");
  const [candPhone, setCandPhone] = useState("");
  const [candSource, setCandSource] = useState("");
  const [candNotes, setCandNotes] = useState("");
  const [candStage, setCandStage] = useState("APPLIED");
  const [candStatus, setCandStatus] = useState("ACTIVE");
  const [candError, setCandError] = useState("");
  const [candSubmitting, setCandSubmitting] = useState(false);

  // Schedule/Edit Interview form
  const [intCandidateId, setIntCandidateId] = useState("");
  const [intScheduledAt, setIntScheduledAt] = useState("");
  const [intInterviewerName, setIntInterviewerName] = useState("");
  const [intMode, setIntMode] = useState("VIDEO");
  const [intStatus, setIntStatus] = useState("SCHEDULED");
  const [intError, setIntError] = useState("");
  const [intSubmitting, setIntSubmitting] = useState(false);

  // Convert Candidate modal
  const [convertCandidateId, setConvertCandidateId] = useState("");
  const [convertSubmitting, setConvertSubmitting] = useState(false);
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null);

  const query = useMemo(
    () => new URLSearchParams({ orgId: ORG_ID, actorRole: ACTOR_ROLE }).toString(),
    []
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const [jobsRes, candidatesRes, interviewsRes] = await Promise.all([
      fetch(`/api/v1/recruitment/jobs?${query}`, { cache: "no-store" }),
      fetch(`/api/v1/recruitment/candidates?${query}`, { cache: "no-store" }),
      fetch(`/api/v1/recruitment/interviews?${query}`, { cache: "no-store" })
    ]);
    if (jobsRes.ok) setJobs((await jobsRes.json()) as JobPosting[]);
    if (candidatesRes.ok) setCandidates((await candidatesRes.json()) as Candidate[]);
    if (interviewsRes.ok) setInterviews((await interviewsRes.json()) as Interview[]);
    setLoading(false);
  }, [query]);

  function closeModal() {
    setModalOpen(null);
    setEditingJobId(null);
    setEditingCandidateId(null);
    setEditingInterviewId(null);
    setConvertSuccess(null);
    setConvertCandidateId("");
    setJobError("");
    setCandError("");
    setIntError("");
  }

  async function submitCreateJob(e: React.FormEvent) {
    e.preventDefault();
    setJobError("");
    const title = jobTitle.trim();
    const department = jobDepartment.trim();
    if (!title || title.length < 2) {
      setJobError("Title must be at least 2 characters.");
      return;
    }
    if (!department || department.length < 2) {
      setJobError("Department must be at least 2 characters.");
      return;
    }
    const openings = Math.max(1, Math.floor(Number(jobOpenings)) || 1);
    setJobSubmitting(true);
    try {
      if (editingJobId) {
        const res = await fetch(`/api/v1/recruitment/jobs/${editingJobId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            orgId: ORG_ID,
            actorRole: ACTOR_ROLE,
            title,
            department,
            employmentType: jobEmploymentType,
            openings,
            status: jobStatus
          })
        });
        if (!res.ok) {
          setJobError((await res.text()) || "Failed to update job.");
          return;
        }
      } else {
        const res = await fetch("/api/v1/recruitment/jobs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            orgId: ORG_ID,
            actorRole: ACTOR_ROLE,
            title,
            department,
            employmentType: jobEmploymentType,
            openings
          })
        });
        if (!res.ok) {
          setJobError((await res.text()) || "Failed to create job.");
          return;
        }
      }
      setJobTitle("");
      setJobDepartment("");
      setJobOpenings(1);
      setJobEmploymentType("FULL_TIME");
      setJobStatus("OPEN");
      closeModal();
      await loadData();
    } finally {
      setJobSubmitting(false);
    }
  }

  async function submitAddCandidate(e: React.FormEvent) {
    e.preventDefault();
    setCandError("");
    const fullName = candFullName.trim();
    const email = candEmail.trim();
    if (!candJobId) {
      setCandError("Please select a job posting.");
      return;
    }
    if (!fullName || fullName.length < 2) {
      setCandError("Full name must be at least 2 characters.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCandError("Please enter a valid email address.");
      return;
    }
    setCandSubmitting(true);
    try {
      if (editingCandidateId) {
        const res = await fetch(`/api/v1/recruitment/candidates/${editingCandidateId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            orgId: ORG_ID,
            actorRole: ACTOR_ROLE,
            jobPostingId: candJobId,
            fullName,
            email,
            phone: candPhone.trim() || undefined,
            source: candSource.trim() || undefined,
            notes: candNotes.trim() || undefined,
            stage: candStage,
            status: candStatus
          })
        });
        if (!res.ok) {
          setCandError((await res.text()) || "Failed to update candidate.");
          return;
        }
      } else {
        const res = await fetch("/api/v1/recruitment/candidates", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            orgId: ORG_ID,
            actorRole: ACTOR_ROLE,
            jobPostingId: candJobId,
            fullName,
            email,
            phone: candPhone.trim() || undefined,
            source: candSource.trim() || undefined,
            notes: candNotes.trim() || undefined
          })
        });
        if (!res.ok) {
          setCandError((await res.text()) || "Failed to add candidate.");
          return;
        }
      }
      setCandJobId("");
      setCandFullName("");
      setCandEmail("");
      setCandPhone("");
      setCandSource("");
      setCandNotes("");
      setCandStage("APPLIED");
      setCandStatus("ACTIVE");
      closeModal();
      await loadData();
    } finally {
      setCandSubmitting(false);
    }
  }

  async function submitScheduleInterview(e: React.FormEvent) {
    e.preventDefault();
    setIntError("");
    const interviewerName = intInterviewerName.trim();
    if (!intCandidateId && !editingInterviewId) {
      setIntError("Please select a candidate.");
      return;
    }
    if (!editingInterviewId && !intScheduledAt) {
      setIntError("Please select date and time.");
      return;
    }
    if (!interviewerName || interviewerName.length < 2) {
      setIntError("Interviewer name must be at least 2 characters.");
      return;
    }
    setIntSubmitting(true);
    try {
      if (editingInterviewId) {
        const res = await fetch(`/api/v1/recruitment/interviews/${editingInterviewId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            orgId: ORG_ID,
            actorRole: ACTOR_ROLE,
            ...(intScheduledAt && { scheduledAt: new Date(intScheduledAt).toISOString() }),
            interviewerName,
            mode: intMode,
            status: intStatus
          })
        });
        if (!res.ok) {
          setIntError((await res.text()) || "Failed to update interview.");
          return;
        }
      } else {
        const res = await fetch("/api/v1/recruitment/interviews", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            orgId: ORG_ID,
            actorRole: ACTOR_ROLE,
            candidateId: intCandidateId,
            scheduledAt: new Date(intScheduledAt!).toISOString(),
            interviewerName,
            mode: intMode
          })
        });
        if (!res.ok) {
          setIntError((await res.text()) || "Failed to schedule interview.");
          return;
        }
      }
      setIntCandidateId("");
      setIntScheduledAt("");
      setIntInterviewerName("");
      setIntMode("VIDEO");
      setIntStatus("SCHEDULED");
      closeModal();
      await loadData();
    } finally {
      setIntSubmitting(false);
    }
  }

  const convertibleCandidates = candidates.filter((c) => c.status !== "CONVERTED");

  async function submitConvertCandidate(e: React.FormEvent) {
    e.preventDefault();
    if (!convertCandidateId) return;
    setConvertSubmitting(true);
    setConvertSuccess(null);
    try {
      const res = await fetch("/api/v1/recruitment/convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orgId: ORG_ID, actorRole: ACTOR_ROLE, candidateId: convertCandidateId })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.employeeCode) {
        const candidate = candidates.find((c) => c.id === convertCandidateId);
        const name = candidate?.fullName ?? "Candidate";
        setConvertSuccess(`${name} has been converted to employee ${data.employeeCode}.`);
        await loadData();
        setTimeout(() => {
          closeModal();
        }, 1800);
      } else {
        setConvertSuccess(null);
      }
    } finally {
      setConvertSubmitting(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const tabs = [
    { key: "jobs" as const, label: "Job Postings", count: jobs.length },
    { key: "candidates" as const, label: "Candidates", count: candidates.length },
    { key: "interviews" as const, label: "Interviews", count: interviews.length }
  ];

  return (
    <DashboardLayout title="Recruitment" subtitle="Manage job postings, candidates, and the interview pipeline">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open Positions"
          value={loading ? "--" : `${jobs.filter((j) => j.status === "OPEN").length}`}
          icon={Briefcase}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <StatCard
          label="Total Candidates"
          value={loading ? "--" : `${candidates.length}`}
          icon={Users}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
        <StatCard
          label="Scheduled Interviews"
          value={loading ? "--" : `${interviews.filter((i) => i.status === "SCHEDULED").length}`}
          icon={Video}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Converted"
          value={loading ? "--" : `${candidates.filter((c) => c.status === "CONVERTED").length}`}
          icon={UserPlus}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => {
            setEditingJobId(null);
            setJobTitle("");
            setJobDepartment("");
            setJobEmploymentType("FULL_TIME");
            setJobOpenings(1);
            setJobStatus("OPEN");
            setJobError("");
            setModalOpen("job");
          }}
        >
          <Plus size={14} /> Create Job
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingCandidateId(null);
            setCandJobId(jobs[0]?.id ?? "");
            setCandFullName("");
            setCandEmail("");
            setCandPhone("");
            setCandSource("");
            setCandNotes("");
            setCandStage("APPLIED");
            setCandStatus("ACTIVE");
            setCandError("");
            setModalOpen("candidate");
          }}
          disabled={jobs.length === 0}
        >
          <UserPlus size={14} /> Add Candidate
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingInterviewId(null);
            setIntCandidateId(convertibleCandidates[0]?.id ?? "");
            setIntScheduledAt("");
            setIntInterviewerName("");
            setIntMode("VIDEO");
            setIntStatus("SCHEDULED");
            setIntError("");
            setModalOpen("interview");
          }}
          disabled={convertibleCandidates.length === 0}
        >
          <CalendarPlus size={14} /> Schedule Interview
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setConvertCandidateId(convertibleCandidates[0]?.id ?? "");
            setConvertSuccess(null);
            setModalOpen("convert");
          }}
          disabled={convertibleCandidates.length === 0}
        >
          <ArrowRightLeft size={14} /> Convert Candidate
        </Button>
        <Button variant="ghost" size="sm" onClick={loadData}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Create/Edit Job Modal */}
      <Modal
        open={modalOpen === "job" || modalOpen === "edit-job"}
        onClose={closeModal}
        title={editingJobId ? "Edit Job Posting" : "Create Job Posting"}
      >
        <form onSubmit={submitCreateJob} className="space-y-1">
          {jobError && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {jobError}
            </div>
          )}
          <FormField label="Job title" required>
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Software Engineer II"
              maxLength={200}
            />
          </FormField>
          <FormField label="Department">
            <Input
              value={jobDepartment}
              onChange={(e) => setJobDepartment(e.target.value)}
              placeholder="e.g. Engineering"
              maxLength={100}
            />
          </FormField>
          <FormField label="Employment type">
            <Select value={jobEmploymentType} onValueChange={setJobEmploymentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Number of openings">
            <Input
              type="number"
              min={1}
              value={jobOpenings}
              onChange={(e) => setJobOpenings(Number(e.target.value) || 1)}
            />
          </FormField>
          {editingJobId && (
            <FormField label="Status">
              <Select value={jobStatus} onValueChange={setJobStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_STATUSES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
          <div className="mt-5 flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={jobSubmitting}>
              {jobSubmitting ? (editingJobId ? "Saving…" : "Creating…") : editingJobId ? "Save changes" : "Create Job"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit Candidate Modal */}
      <Modal
        open={modalOpen === "candidate" || modalOpen === "edit-candidate"}
        onClose={closeModal}
        title={editingCandidateId ? "Edit Candidate" : "Add Candidate"}
      >
        <form onSubmit={submitAddCandidate} className="space-y-1">
          {candError && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {candError}
            </div>
          )}
          <FormField label="Job posting" required>
            <Select value={candJobId} onValueChange={setCandJobId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a job" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.title} ({j.department})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Full name" required>
            <Input
              value={candFullName}
              onChange={(e) => setCandFullName(e.target.value)}
              placeholder="e.g. Riya Sharma"
              maxLength={200}
            />
          </FormField>
          <FormField label="Email" required>
            <Input
              type="email"
              value={candEmail}
              onChange={(e) => setCandEmail(e.target.value)}
              placeholder="e.g. riya@example.com"
            />
          </FormField>
          <FormField label="Phone (optional)">
            <Input
              type="tel"
              value={candPhone}
              onChange={(e) => setCandPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
            />
          </FormField>
          <FormField label="Source (optional)">
            <Input
              value={candSource}
              onChange={(e) => setCandSource(e.target.value)}
              placeholder="e.g. LinkedIn, Referral"
            />
          </FormField>
          <FormField label="Notes (optional)">
            <Textarea
              value={candNotes}
              onChange={(e) => setCandNotes(e.target.value)}
              placeholder="Internal notes about the candidate"
              rows={3}
            />
          </FormField>
          {editingCandidateId && (
            <>
              <FormField label="Stage">
                <Select value={candStage} onValueChange={setCandStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANDIDATE_STAGES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Status">
                <Select value={candStatus} onValueChange={setCandStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANDIDATE_STATUSES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </>
          )}
          <div className="mt-5 flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={candSubmitting}>
              {candSubmitting ? (editingCandidateId ? "Saving…" : "Adding…") : editingCandidateId ? "Save changes" : "Add Candidate"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Schedule/Edit Interview Modal */}
      <Modal
        open={modalOpen === "interview" || modalOpen === "edit-interview"}
        onClose={closeModal}
        title={editingInterviewId ? "Edit Interview" : "Schedule Interview"}
      >
        <form onSubmit={submitScheduleInterview} className="space-y-1">
          {intError && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {intError}
            </div>
          )}
          {!editingInterviewId && (
            <FormField label="Candidate" required>
              <Select value={intCandidateId} onValueChange={setIntCandidateId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a candidate" />
                </SelectTrigger>
                <SelectContent>
                  {convertibleCandidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName} – {c.jobPosting.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
          <FormField label="Date & time" required={!editingInterviewId}>
            <Input
              type="datetime-local"
              value={intScheduledAt}
              onChange={(e) => setIntScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </FormField>
          <FormField label="Interviewer name" required>
            <Input
              value={intInterviewerName}
              onChange={(e) => setIntInterviewerName(e.target.value)}
              placeholder="e.g. Hiring Manager"
              maxLength={200}
            />
          </FormField>
          <FormField label="Mode">
            <Select value={intMode} onValueChange={setIntMode}>
              <SelectTrigger>
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_MODES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {editingInterviewId && (
            <FormField label="Status">
              <Select value={intStatus} onValueChange={setIntStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_STATUSES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
          <div className="mt-5 flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={intSubmitting}>
              {intSubmitting ? (editingInterviewId ? "Saving…" : "Scheduling…") : editingInterviewId ? "Save changes" : "Schedule Interview"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Convert Candidate Modal */}
      <Modal
        open={modalOpen === "convert"}
        onClose={closeModal}
        title="Convert Candidate"
      >
        {convertSuccess ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {convertSuccess}
          </div>
        ) : (
          <form onSubmit={submitConvertCandidate} className="space-y-1">
            <FormField label="Choose candidate to convert" required>
              <Select
                value={convertCandidateId}
                onValueChange={setConvertCandidateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a candidate" />
                </SelectTrigger>
                <SelectContent>
                  {convertibleCandidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName} – {c.jobPosting.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <p className="mb-4 text-xs text-slate-500">
              Converts the candidate into an employee record and marks them as converted. The employee will get an auto-generated employee code.
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!convertCandidateId || convertSubmitting}>
                {convertSubmitting ? "Converting…" : "Convert to Employee"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Tabs */}
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
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              activeTab === tab.key ? "bg-brand-50 text-brand-700" : "bg-slate-200 text-slate-500"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <Card className="mt-4">
        <CardContent className="pt-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : activeTab === "jobs" ? (
            jobs.length === 0 ? (
              <EmptyState icon={Inbox} title="No job postings" description="Create your first job posting to start hiring." />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Title</TH>
                      <TH>Department</TH>
                      <TH>Type</TH>
                      <TH>Openings</TH>
                      <TH>Status</TH>
                      <TH className="w-[80px] text-right">Actions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {jobs.map((j) => (
                      <tr key={j.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                        <TD className="font-medium text-slate-900">{j.title}</TD>
                        <TD>{j.department}</TD>
                        <TD>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {j.employmentType.replace("_", " ")}
                          </span>
                        </TD>
                        <TD className="font-semibold">{j.openings}</TD>
                        <TD>
                          <Badge variant={jobStatusBadge[j.status] ?? "outline"}>{j.status}</Badge>
                        </TD>
                        <TD className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-700"
                            onClick={() => {
                              setEditingJobId(j.id);
                              setJobTitle(j.title);
                              setJobDepartment(j.department);
                              setJobEmploymentType(j.employmentType);
                              setJobOpenings(j.openings);
                              setJobStatus(j.status);
                              setModalOpen("edit-job");
                            }}
                            aria-label="Edit job"
                          >
                            <Pencil size={14} />
                          </Button>
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )
          ) : activeTab === "candidates" ? (
            candidates.length === 0 ? (
              <EmptyState icon={Inbox} title="No candidates" description="Add candidates to track them through the pipeline." />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Candidate</TH>
                      <TH>Job</TH>
                      <TH>Stage</TH>
                      <TH>Status</TH>
                      <TH className="w-[80px] text-right">Actions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {candidates.map((c) => (
                      <tr key={c.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                        <TD>
                          <div>
                            <p className="font-medium text-slate-900">{c.fullName}</p>
                            <p className="text-xs text-slate-400">{c.email}</p>
                          </div>
                        </TD>
                        <TD>{c.jobPosting.title}</TD>
                        <TD>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{c.stage}</span>
                        </TD>
                        <TD>
                          <Badge variant={candidateStatusBadge[c.status] ?? "outline"}>{c.status}</Badge>
                        </TD>
                        <TD className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-700"
                            onClick={() => {
                              setEditingCandidateId(c.id);
                              setCandJobId(c.jobPosting.id);
                              setCandFullName(c.fullName);
                              setCandEmail(c.email);
                              setCandPhone(c.phone ?? "");
                              setCandSource(c.source ?? "");
                              setCandNotes(c.notes ?? "");
                              setCandStage(c.stage);
                              setCandStatus(c.status);
                              setModalOpen("edit-candidate");
                            }}
                            aria-label="Edit candidate"
                          >
                            <Pencil size={14} />
                          </Button>
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )
          ) : interviews.length === 0 ? (
            <EmptyState icon={Inbox} title="No interviews" description="Schedule interviews with candidates." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <Table>
                <THead>
                  <tr>
                    <TH>Candidate</TH>
                    <TH>Interviewer</TH>
                    <TH>Mode</TH>
                    <TH>Scheduled</TH>
                    <TH>Status</TH>
                    <TH className="w-[80px] text-right">Actions</TH>
                  </tr>
                </THead>
                <TBody>
                  {interviews.map((i) => (
                    <tr key={i.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                      <TD>
                        <div>
                          <p className="font-medium text-slate-900">{i.candidate.fullName}</p>
                          <p className="text-xs text-slate-400">{i.candidate.email}</p>
                        </div>
                      </TD>
                      <TD>{i.interviewerName}</TD>
                      <TD>
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {i.mode === "VIDEO" && <Video size={12} />}
                          {i.mode}
                        </span>
                      </TD>
                      <TD>{new Date(i.scheduledAt).toLocaleString()}</TD>
                      <TD>
                        <Badge variant={interviewStatusBadge[i.status] ?? "outline"}>{i.status}</Badge>
                      </TD>
                      <TD className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-slate-700"
                          onClick={() => {
                            setEditingInterviewId(i.id);
                            setIntScheduledAt(new Date(i.scheduledAt).toISOString().slice(0, 16));
                            setIntInterviewerName(i.interviewerName);
                            setIntMode(i.mode);
                            setIntStatus(i.status);
                            setModalOpen("edit-interview");
                          }}
                          aria-label="Edit interview"
                        >
                          <Pencil size={14} />
                        </Button>
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
