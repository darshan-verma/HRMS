import { createAuditLog } from "@/lib/audit/audit-log";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { hashPassword } from "@/lib/auth/password";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

function readBearerToken(header: string | null): string | null {
  if (!header) return null;
  const [kind, token] = header.split(" ");
  if (kind !== "Bearer" || !token) return null;
  return token;
}

/** Returns the authenticated user if they are an active SUPER_ADMIN; otherwise returns a 401/403 response. */
async function requireSuperAdmin(req: NextRequest): Promise<
  | { ok: true; user: { id: string; orgId: string } }
  | { ok: false; response: NextResponse }
> {
  const token = readBearerToken(req.headers.get("authorization"));
  if (!token) return { ok: false, response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };

  let claims;
  try {
    claims = await verifyAccessToken(token);
  } catch (err: unknown) {
    const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "";
    if (code === "ERR_JWT_EXPIRED" || code === "ERR_JWT_CLAIM_VALIDATION_FAILED") {
      return {
        ok: false,
        response: NextResponse.json({ message: "Token expired", code: "TOKEN_EXPIRED" }, { status: 401 })
      };
    }
    return { ok: false, response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  if (claims.type !== "access") {
    return { ok: false, response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, orgId: true, role: true, isActive: true }
  });
  if (!user || !user.isActive) {
    return { ok: false, response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }
  if (user.role !== ROLES.SUPER_ADMIN) {
    return { ok: false, response: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, user: { id: user.id, orgId: user.orgId } };
}

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.string().optional(),
  search: z.string().optional()
});

const createSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum([
    ROLES.EMPLOYEE,
    ROLES.MANAGER,
    ROLES.HRBP,
    ROLES.PAYROLL_MANAGER,
    ROLES.HRMS_ADMIN
  ])
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.response;

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const query = listSchema.parse(params);

  const where: { orgId: string; role?: string; email?: { contains: string; mode: "insensitive" } } = {
    orgId: auth.user.orgId
  };
  if (query.role) where.role = query.role;
  if (query.search && query.search.trim()) {
    where.email = { contains: query.search.trim(), mode: "insensitive" };
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize
    }),
    prisma.user.count({ where })
  ]);

  return NextResponse.json({ users, total });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.response;

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return NextResponse.json(
        { message: first?.message ?? "Validation failed" },
        { status: 400 }
      );
    }
    throw err;
  }

  const existing = await prisma.user.findUnique({
    where: { orgId_email: { orgId: auth.user.orgId, email: body.email } }
  });
  if (existing) {
    return NextResponse.json(
      { message: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(body.password);

  const user = await prisma.user.create({
    data: {
      orgId: auth.user.orgId,
      email: body.email,
      passwordHash,
      role: body.role,
      isActive: true
    },
    select: { id: true, email: true, role: true, isActive: true, createdAt: true }
  });

  await createAuditLog({
    orgId: auth.user.orgId,
    actorUserId: auth.user.id,
    action: "USER_CREATE",
    resourceType: "USER",
    resourceId: user.id,
    metadata: { email: user.email, role: user.role }
  });

  return NextResponse.json(user, { status: 201 });
}
