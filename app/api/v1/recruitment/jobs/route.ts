import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/audit/audit-log";
import { RecruitmentService } from "@/src/modules/recruitment/recruitment.service";

const service = new RecruitmentService();

const listSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1)
});

const createSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  title: z.string().min(2),
  department: z.string().min(2),
  employmentType: z.string().min(2),
  openings: z.number().int().positive().optional()
});

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const input = listSchema.parse(params);
    if (!hasPermission(input.actorRole, PERMISSIONS.RECRUITMENT_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const rows = await service.listJobPostings(input.orgId);
    return NextResponse.json(rows);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Failed to fetch job postings." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = createSchema.parse(await request.json());
    if (!hasPermission(input.actorRole, PERMISSIONS.RECRUITMENT_WRITE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const created = await service.createJobPosting(input);
    await createAuditLog({
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      action: "recruitment.job.create",
      resourceType: "job_posting",
      resourceId: created.id
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Failed to create job posting." }, { status: 500 });
  }
}
