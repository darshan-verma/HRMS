import { createAuditLog } from "@/lib/audit/audit-log";
import { AuthService } from "@/src/modules/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { OAuth2Client } from "google-auth-library";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  idToken: z.string().min(20),
  orgId: z.string().min(1),
  role: z.enum(["EMPLOYEE", "MANAGER", "HR_ADMIN"]).default("EMPLOYEE")
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = schema.parse(await req.json());

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    return NextResponse.json(
      { message: "Google auth is not configured" },
      { status: 500 }
    );
  }

  const client = new OAuth2Client(googleClientId);
  const ticket = await client.verifyIdToken({
    idToken: body.idToken,
    audience: googleClientId
  });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) {
    return NextResponse.json({ message: "Google account is invalid" }, { status: 401 });
  }

  await prisma.user.upsert({
    where: {
      orgId_email: {
        orgId: body.orgId,
        email: payload.email
      }
    },
    update: { isActive: true },
    create: {
      orgId: body.orgId,
      email: payload.email,
      role: body.role,
      isActive: true
    }
  });

  const authService = new AuthService();
  const tokens = await authService.loginWithEmail({
    email: payload.email,
    orgId: body.orgId
  });

  await createAuditLog({
    orgId: body.orgId,
    action: "AUTH_GOOGLE_LOGIN",
    resourceType: "SESSION",
    metadata: { email: payload.email }
  });

  return NextResponse.json(tokens);
}
