import { prisma } from "@/lib/prisma";

type CreateJobInput = {
  orgId: string;
  title: string;
  department: string;
  employmentType: string;
  openings?: number;
};

type CreateCandidateInput = {
  orgId: string;
  jobPostingId: string;
  fullName: string;
  email: string;
  phone?: string;
  source?: string;
  notes?: string;
};

type ScheduleInterviewInput = {
  orgId: string;
  candidateId: string;
  scheduledAt: string;
  interviewerName: string;
  mode: string;
};

export class RecruitmentService {
  async createJobPosting(input: CreateJobInput) {
    return prisma.jobPosting.create({
      data: {
        orgId: input.orgId,
        title: input.title,
        department: input.department,
        employmentType: input.employmentType,
        openings: input.openings ?? 1,
        status: "OPEN"
      }
    });
  }

  async listJobPostings(orgId: string) {
    return prisma.jobPosting.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" }
    });
  }

  async updateJobPosting(
    orgId: string,
    id: string,
    data: { title?: string; department?: string; employmentType?: string; openings?: number; status?: string }
  ) {
    await prisma.jobPosting.findFirstOrThrow({ where: { id, orgId } });
    return prisma.jobPosting.update({
      where: { id },
      data: { ...data, ...(data.openings != null && { openings: data.openings }) }
    });
  }

  async createCandidate(input: CreateCandidateInput) {
    return prisma.candidate.create({
      data: {
        orgId: input.orgId,
        jobPostingId: input.jobPostingId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        source: input.source,
        notes: input.notes,
        stage: "APPLIED",
        status: "ACTIVE"
      }
    });
  }

  async listCandidates(orgId: string) {
    return prisma.candidate.findMany({
      where: { orgId },
      include: {
        jobPosting: { select: { id: true, title: true, department: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async updateCandidate(
    orgId: string,
    id: string,
    data: {
      jobPostingId?: string;
      fullName?: string;
      email?: string;
      phone?: string;
      source?: string;
      notes?: string;
      stage?: string;
      status?: string;
    }
  ) {
    await prisma.candidate.findFirstOrThrow({ where: { id, orgId } });
    return prisma.candidate.update({ where: { id }, data });
  }

  async scheduleInterview(input: ScheduleInterviewInput) {
    return prisma.interview.create({
      data: {
        orgId: input.orgId,
        candidateId: input.candidateId,
        scheduledAt: new Date(input.scheduledAt),
        interviewerName: input.interviewerName,
        mode: input.mode,
        status: "SCHEDULED"
      }
    });
  }

  async listInterviews(orgId: string) {
    return prisma.interview.findMany({
      where: { orgId },
      include: {
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: { scheduledAt: "asc" }
    });
  }

  async updateInterview(
    orgId: string,
    id: string,
    data: { scheduledAt?: string; interviewerName?: string; mode?: string; status?: string }
  ) {
    await prisma.interview.findFirstOrThrow({ where: { id, orgId } });
    return prisma.interview.update({
      where: { id },
      data: { ...data, ...(data.scheduledAt != null && { scheduledAt: new Date(data.scheduledAt) }) }
    });
  }

  async convertCandidateToEmployee(orgId: string, candidateId: string) {
    return prisma.$transaction(async (tx) => {
      const candidate = await tx.candidate.findFirst({
        where: { id: candidateId, orgId },
        include: { jobPosting: true }
      });
      if (!candidate) {
        throw new Error("Candidate not found.");
      }
      if (candidate.convertedEmployeeId) {
        throw new Error("Candidate already converted.");
      }

      const code = `EMP-${Date.now().toString().slice(-8)}`;
      const employee = await tx.employee.create({
        data: {
          orgId,
          employeeCode: code,
          fullName: candidate.fullName,
          designation: candidate.jobPosting.title
        }
      });

      await tx.candidate.update({
        where: { id: candidate.id },
        data: {
          stage: "HIRED",
          status: "CONVERTED",
          convertedEmployeeId: employee.id
        }
      });

      return { candidateId: candidate.id, employeeId: employee.id, employeeCode: employee.employeeCode };
    });
  }
}
