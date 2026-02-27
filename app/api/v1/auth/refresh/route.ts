import { createAuditLog } from "@/lib/audit/audit-log";
import { AuthService } from "@/src/modules/auth/auth.service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  refreshToken: z.string().min(32),
  orgId: z.string().min(1),
  actorUserId: z.string().optional()
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = schema.parse(await req.json());
  const authService = new AuthService();
  const tokens = await authService.rotateRefreshToken(body.refreshToken);

  await createAuditLog({
    orgId: body.orgId,
    actorUserId: body.actorUserId,
    action: "AUTH_REFRESH",
    resourceType: "SESSION"
  });

  return NextResponse.json(tokens);
}
