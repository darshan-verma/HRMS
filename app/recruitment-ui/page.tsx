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
  CalendarPlus
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

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
  stage: string;
  status: string;
  jobPosting: { title: string };
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

export default function RecruitmentUiPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [response, setResponse] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"jobs" | "candidates" | "interviews">("jobs");

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

  async function createSampleJob() {
    const res = await fetch("/api/v1/recruitment/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orgId: ORG_ID,
        actorRole: ACTOR_ROLE,
        title: "Software Engineer II",
        department: "Engineering",
        employmentType: "FULL_TIME",
        openings: 2
      })
    });
    setResponse(await res.text());
    await loadData();
  }

  async function createSampleCandidate() {
    const firstJob = jobs[0];
    if (!firstJob) {
      setResponse("Create a job posting first.");
      return;
    }
    const res = await fetch("/api/v1/recruitment/candidates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orgId: ORG_ID,
        actorRole: ACTOR_ROLE,
        jobPostingId: firstJob.id,
        fullName: "Riya Sharma",
        email: `riya.${Date.now()}@mail.com`,
        source: "LinkedIn"
      })
    });
    setResponse(await res.text());
    await loadData();
  }

  async function scheduleSampleInterview() {
    const firstCandidate = candidates[0];
    if (!firstCandidate) {
      setResponse("Create a candidate first.");
      return;
    }
    const res = await fetch("/api/v1/recruitment/interviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orgId: ORG_ID,
        actorRole: ACTOR_ROLE,
        candidateId: firstCandidate.id,
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        interviewerName: "Hiring Manager",
        mode: "VIDEO"
      })
    });
    setResponse(await res.text());
    await loadData();
  }

  async function convertFirstCandidate() {
    const firstCandidate = candidates.find((c) => c.status !== "CONVERTED");
    if (!firstCandidate) {
      setResponse("No convertible candidate available.");
      return;
    }
    const res = await fetch("/api/v1/recruitment/convert", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: ORG_ID, actorRole: ACTOR_ROLE, candidateId: firstCandidate.id })
    });
    setResponse(await res.text());
    await loadData();
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
        <Button size="sm" onClick={createSampleJob}>
          <Plus size={14} /> Create Job
        </Button>
        <Button variant="outline" size="sm" onClick={createSampleCandidate}>
          <UserPlus size={14} /> Add Candidate
        </Button>
        <Button variant="outline" size="sm" onClick={scheduleSampleInterview}>
          <CalendarPlus size={14} /> Schedule Interview
        </Button>
        <Button variant="outline" size="sm" onClick={convertFirstCandidate}>
          <ArrowRightLeft size={14} /> Convert Candidate
        </Button>
        <Button variant="ghost" size="sm" onClick={loadData}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {response && (
        <pre className="mt-4 overflow-auto rounded-lg border border-slate-200 bg-slate-900 p-4 text-xs text-slate-100">
          {response}
        </pre>
      )}

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
