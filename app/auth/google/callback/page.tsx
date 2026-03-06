"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuthTokens } from "@/lib/auth/client-tokens";

const DEFAULT_ORG_ID = "seed-org";

function getParamFromHash(hash: string, key: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get(key);
}

function AuthGoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const hash = window.location.hash;
    const error = searchParams.get("error") ?? getParamFromHash(hash, "error");
    if (error) {
      handled.current = true;
      router.replace(`/signin?error=${encodeURIComponent(error)}`);
      return;
    }
    const idToken = getParamFromHash(hash, "id_token");
    if (!idToken) {
      return;
    }
    handled.current = true;
    fetch("/api/v1/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken,
        orgId: DEFAULT_ORG_ID,
        role: "EMPLOYEE"
      })
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.message ?? "Google sign-in failed")));
        return r.json();
      })
      .then((data: { accessToken: string; refreshToken: string }) => {
        setAuthTokens(data.accessToken, data.refreshToken, DEFAULT_ORG_ID);
        window.dispatchEvent(new CustomEvent("hrms:auth-tokens-set"));
        router.replace("/dashboard");
        router.refresh();
      })
      .catch((err: Error) => {
        router.replace(`/signin?error=${encodeURIComponent(err.message || "Google sign-in failed")}`);
      });
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <p className="text-sm text-slate-600">Signing you in with Google…</p>
    </div>
  );
}

export default function AuthGoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
          <p className="text-sm text-slate-600">Signing you in with Google…</p>
        </div>
      }
    >
      <AuthGoogleCallbackContent />
    </Suspense>
  );
}
