import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth/jwt";
import { hashToken } from "@/lib/auth/token-store";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

const DEFAULT_ORG_ID = process.env.SEED_ORG_ID ?? "seed-org";

type LoginInput = {
  email: string;
  orgId?: string;
  password: string;
};

export class AuthService {
  async loginWithEmailAndPassword(input: LoginInput): Promise<{ accessToken: string; refreshToken: string }> {
    const orgId = input.orgId ?? DEFAULT_ORG_ID;
    const user = await prisma.user.findFirst({
      where: {
        email: input.email,
        orgId,
        isActive: true
      }
    });
    if (!user) throw new Error("Invalid credentials");
    if (!user.passwordHash) throw new Error("Invalid credentials");
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) throw new Error("Invalid credentials");

    const baseClaims = { sub: user.id, orgId: user.orgId, role: user.role };
    const accessToken = await signAccessToken(baseClaims);
    const refreshToken = await signRefreshToken(baseClaims);
    const refreshClaims = await verifyRefreshToken(refreshToken);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date((refreshClaims.exp ?? 0) * 1000)
      }
    });
    return { accessToken, refreshToken };
  }

  async loginWithEmail(input: { email: string; orgId: string }): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await prisma.user.findFirst({
      where: {
        email: input.email,
        orgId: input.orgId,
        isActive: true
      }
    });
    if (!user) throw new Error("Invalid credentials");

    const baseClaims = { sub: user.id, orgId: user.orgId, role: user.role };
    const accessToken = await signAccessToken(baseClaims);
    const refreshToken = await signRefreshToken(baseClaims);
    const refreshClaims = await verifyRefreshToken(refreshToken);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date((refreshClaims.exp ?? 0) * 1000)
      }
    });
    return { accessToken, refreshToken };
  }

  async rotateRefreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const claims = await verifyRefreshToken(refreshToken);
    if (claims.type !== "refresh") throw new Error("Invalid token type");

    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });
    if (!stored || !stored.user.isActive) throw new Error("Refresh token is invalid");

    const baseClaims = {
      sub: stored.userId,
      orgId: claims.orgId,
      role: stored.user.role
    };

    const nextAccessToken = await signAccessToken(baseClaims);
    const nextRefreshToken = await signRefreshToken(baseClaims);
    const nextClaims = await verifyRefreshToken(nextRefreshToken);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() }
      }),
      prisma.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: hashToken(nextRefreshToken),
          expiresAt: new Date((nextClaims.exp ?? 0) * 1000)
        }
      })
    ]);

    return { accessToken: nextAccessToken, refreshToken: nextRefreshToken };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }
}
