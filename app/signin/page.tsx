"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleIcon } from "@/components/ui/google-icon";
import { setAuthTokens } from "@/lib/auth/client-tokens";

const DEFAULT_ORG_ID = "seed-org";

function buildGoogleAuthUrl(clientId: string): string {
  const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/auth/google/callback` : "";
  const scope = "openid email profile";
  const nonce = typeof crypto !== "undefined" && crypto.getRandomValues
    ? Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    : "default_nonce";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "id_token",
    scope,
    nonce
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleClientId, setGoogleClientId] = useState<string | null>(
    () => process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? null
  );

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) setError(decodeURIComponent(urlError));
  }, [searchParams]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? null;
    if (clientId) setGoogleClientId(clientId);
    else {
      fetch("/api/v1/auth/config")
        .then((r) => r.json())
        .then((data: { googleClientId?: string | null }) => setGoogleClientId(data.googleClientId ?? null))
        .catch(() => setGoogleClientId(null));
    }
  }, []);

  const handleGoogleClick = () => {
    if (!googleClientId) return;
    const url = buildGoogleAuthUrl(googleClientId);
    window.location.href = url;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password })
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.message ?? "Sign in failed")));
        return r.json();
      })
      .then((data: { accessToken: string; refreshToken: string }) => {
        setAuthTokens(data.accessToken, data.refreshToken, DEFAULT_ORG_ID);
        router.push("/dashboard");
        router.refresh();
      })
      .catch((err: Error) => {
        setError(err.message || "Invalid email or password");
        setLoading(false);
      });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>Enter your email and password to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-rose-600" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {googleClientId && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-slate-500">or continue with</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <GoogleIcon className="shrink-0" />
                Continue with Google
              </button>
            </>
          )}

          <p className="text-center text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-brand-600 hover:text-brand-700">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-xs text-slate-500">
        Enterprise HRMS · Secure sign-in
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Sign in</CardTitle>
              <CardDescription>Enter your email and password to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Loading…</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
