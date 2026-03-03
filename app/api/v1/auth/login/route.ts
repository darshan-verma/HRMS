import { createAuditLog } from "@/lib/audit/audit-log";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { AuthService } from "@/src/modules/auth/auth.service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
  orgId: z.string().min(1).optional()
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const allowed = await checkRateLimit(`login:${ip}`, 10, 60);
  if (!allowed) return NextResponse.json({ message: "Too many requests" }, { status: 429 });

  const body = schema.parse(await req.json());
  const authService = new AuthService();
  const tokens = await authService.loginWithEmailAndPassword({
    email: body.email,
    password: body.password,
    orgId: body.orgId
  });

  await createAuditLog({
    orgId: body.orgId ?? process.env.SEED_ORG_ID ?? "seed-org",
    action: "AUTH_LOGIN",
    resourceType: "SESSION",
    ipAddress: ip
  });

  return NextResponse.json(tokens);
}
