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
  candidateId: z.string().min(1),
  scheduledAt: z.string().min(1),
  interviewerName: z.string().min(2),
  mode: z.string().min(2)
});

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const input = listSchema.parse(params);
    if (!hasPermission(input.actorRole, PERMISSIONS.RECRUITMENT_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const rows = await service.listInterviews(input.orgId);
    return NextResponse.json(rows);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Failed to fetch interviews." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = createSchema.parse(await request.json());
    if (!hasPermission(input.actorRole, PERMISSIONS.RECRUITMENT_WRITE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const created = await service.scheduleInterview(input);
    await createAuditLog({
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      action: "recruitment.interview.schedule",
      resourceType: "interview",
      resourceId: created.id
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Failed to schedule interview." }, { status: 500 });
  }
}
