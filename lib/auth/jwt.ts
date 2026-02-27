import { SignJWT, jwtVerify } from "jose";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "";

function getKey(secret: string): Uint8Array {
  if (!secret) throw new Error("JWT secret is not configured");
  return new TextEncoder().encode(secret);
}

export type JwtClaims = {
  sub: string;
  orgId: string;
  role: string;
  type: "access" | "refresh";
  exp?: number;
};

export async function signAccessToken(claims: Omit<JwtClaims, "type">): Promise<string> {
  return new SignJWT({ ...claims, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_ACCESS_TTL ?? "15m")
    .sign(getKey(ACCESS_SECRET));
}

export async function signRefreshToken(claims: Omit<JwtClaims, "type">): Promise<string> {
  return new SignJWT({ ...claims, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_REFRESH_TTL ?? "7d")
    .sign(getKey(REFRESH_SECRET));
}

export async function verifyAccessToken(token: string): Promise<JwtClaims> {
  const { payload } = await jwtVerify(token, getKey(ACCESS_SECRET));
  return payload as JwtClaims;
}

export async function verifyRefreshToken(token: string): Promise<JwtClaims> {
  const { payload } = await jwtVerify(token, getKey(REFRESH_SECRET));
  return payload as JwtClaims;
}
