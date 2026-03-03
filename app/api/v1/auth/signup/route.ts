import { createAuditLog } from "@/lib/audit/audit-log";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DEFAULT_ORG_ID = process.env.SEED_ORG_ID ?? "seed-org";

const schema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["EMPLOYEE", "MANAGER", "HR_ADMIN"]).default("EMPLOYEE")
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const allowed = await checkRateLimit(`signup:${ip}`, 10, 60);
  if (!allowed) return NextResponse.json({ message: "Too many requests" }, { status: 429 });

  const body = schema.parse(await req.json());

  const org = await prisma.organization.findUnique({ where: { id: DEFAULT_ORG_ID } });
  if (!org) {
    return NextResponse.json({ message: "Organization not found" }, { status: 404 });
  }

  const existing = await prisma.user.findUnique({
    where: { orgId_email: { orgId: DEFAULT_ORG_ID, email: body.email } }
  });
  if (existing) {
    return NextResponse.json({ message: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(body.password);

  const user = await prisma.user.create({
    data: {
      orgId: DEFAULT_ORG_ID,
      email: body.email,
      passwordHash,
      role: body.role,
      isActive: true
    }
  });

  await createAuditLog({
    orgId: DEFAULT_ORG_ID,
    action: "AUTH_SIGNUP",
    resourceType: "USER",
    resourceId: user.id,
    metadata: { email: body.email, role: body.role }
  });

  return NextResponse.json({ message: "Account created. You can sign in now." }, { status: 201 });
}
