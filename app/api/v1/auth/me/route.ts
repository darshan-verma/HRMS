import { verifyAccessToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function readBearerToken(header: string | null): string | null {
  if (!header) return null;
  const [kind, token] = header.split(" ");
  if (kind !== "Bearer" || !token) return null;
  return token;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = readBearerToken(req.headers.get("authorization"));
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const claims = await verifyAccessToken(token);
  if (claims.type !== "access") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, role: true, orgId: true, isActive: true }
  });
  if (!user || !user.isActive) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(user);
}
