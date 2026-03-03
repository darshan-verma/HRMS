"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

const ROLES = [
  { value: "EMPLOYEE", label: "Employee" },
  { value: "MANAGER", label: "Manager" },
  { value: "HR_ADMIN", label: "HR Admin" }
] as const;

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"EMPLOYEE" | "MANAGER" | "HR_ADMIN">("EMPLOYEE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [googleClientId, setGoogleClientId] = useState<string | null>(
    () => process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? null
  );

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
    setSuccess("");
    setLoading(true);
    fetch("/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password, role })
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.message ?? "Sign up failed")));
        return r.json();
      })
      .then((data: { message?: string }) => {
        setSuccess(data.message ?? "Account created. You can sign in now.");
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message || "Sign up failed");
        setLoading(false);
      });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign up</CardTitle>
          <CardDescription>Create an account with your email or Google</CardDescription>
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-slate-700">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as "EMPLOYEE" | "MANAGER" | "HR_ADMIN")}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <p className="text-sm text-rose-600" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-emerald-600" role="status">
                {success}
              </p>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Creating account…" : "Sign up"}
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
            Already have an account?{" "}
            <Link href="/signin" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-xs text-slate-500">
        Enterprise HRMS · Secure sign-up
      </p>
    </div>
  );
}
