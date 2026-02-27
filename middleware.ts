import { NextRequest, NextResponse } from "next/server";

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function buildCsp(): string {
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self'";

  return [
    "default-src 'self'",
    "img-src 'self' data:",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' ws: wss:"
  ].join("; ");
}

export function middleware(req: NextRequest): NextResponse {
  const res = NextResponse.next();

  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Content-Security-Policy", buildCsp());

  if (
    process.env.NODE_ENV === "production" &&
    req.nextUrl.pathname.startsWith("/api") &&
    STATE_CHANGING.has(req.method)
  ) {
    const csrfCookie = req.cookies.get("csrf_token")?.value;
    const csrfHeader = req.headers.get("x-csrf-token");
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json({ message: "CSRF validation failed" }, { status: 403 });
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
