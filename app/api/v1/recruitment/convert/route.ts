import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/audit/audit-log";
import { RecruitmentService } from "@/src/modules/recruitment/recruitment.service";

const service = new RecruitmentService();

const convertSchema = z.object({
  orgId: z.string().min(1),
  actorRole: z.string().min(1),
  actorUserId: z.string().optional(),
  candidateId: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const input = convertSchema.parse(await request.json());
    if (!hasPermission(input.actorRole, PERMISSIONS.RECRUITMENT_WRITE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await service.convertCandidateToEmployee(input.orgId, input.candidateId);
    await createAuditLog({
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      action: "recruitment.candidate.convert",
      resourceType: "candidate",
      resourceId: input.candidateId,
      metadata: result
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to convert candidate." },
      { status: 500 }
    );
  }
}
