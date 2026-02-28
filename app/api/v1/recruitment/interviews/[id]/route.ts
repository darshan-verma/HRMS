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
  scheduledAt: z.string().min(1).optional(),
  interviewerName: z.string().min(2).optional(),
  mode: z.string().min(2).optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional()
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = updateSchema.parse(body);
    if (!hasPermission(input.actorRole, PERMISSIONS.RECRUITMENT_WRITE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updated = await service.updateInterview(input.orgId, id, {
      scheduledAt: input.scheduledAt,
      interviewerName: input.interviewerName,
      mode: input.mode,
      status: input.status
    });
    await createAuditLog({
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      action: "recruitment.interview.update",
      resourceType: "interview",
      resourceId: id
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Failed to update interview." }, { status: 500 });
  }
}
