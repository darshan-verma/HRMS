import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/audit/audit-log";
import { RecruitmentService } from "@/src/modules/recruitment/recruitment.service";

const service = new RecruitmentService();

const updateSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  title: z.string().min(2).optional(),
  department: z.string().min(2).optional(),
  employmentType: z.string().min(2).optional(),
  openings: z.number().int().positive().optional(),
  status: z.enum(["OPEN", "CLOSED", "DRAFT", "ON_HOLD"]).optional()
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = updateSchema.parse({ ...body, id });
    if (!hasPermission(input.actorRole, PERMISSIONS.RECRUITMENT_WRITE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updated = await service.updateJobPosting(input.orgId, id, {
      title: input.title,
      department: input.department,
      employmentType: input.employmentType,
      openings: input.openings,
      status: input.status
    });
    await createAuditLog({
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      action: "recruitment.job.update",
      resourceType: "job_posting",
      resourceId: id
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Failed to update job posting." }, { status: 500 });
  }
}
