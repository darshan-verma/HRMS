"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  getAccessToken,
  getRefreshToken,
  getStoredOrgId,
  setAuthTokens,
  clearAuth
} from "@/lib/auth/client-tokens";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  orgId: string;
  isActive: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refetch: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(accessToken: string): Promise<AuthUser | null> {
  const res = await fetch("/api/v1/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && data.code === "TOKEN_EXPIRED") {
      return "TOKEN_EXPIRED" as unknown as AuthUser | null;
    }
    return null;
  }
  const data = await res.json();
  return {
    id: data.id,
    email: data.email,
    role: (data.role ?? "").toString().toUpperCase(),
    orgId: data.orgId,
    isActive: data.isActive === true
  };
}

async function refreshTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const refreshToken = getRefreshToken();
  const orgId = getStoredOrgId();
  if (!refreshToken || !orgId) return null;
  const res = await fetch("/api/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken, orgId }),
    cache: "no-store"
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.accessToken || !data.refreshToken) return null;
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}

async function fetchMeWithRefresh(): Promise<AuthUser | null> {
  const token = getAccessToken();
  if (!token) return null;

  const user = await fetchMe(token);
  if (user !== ("TOKEN_EXPIRED" as unknown as AuthUser | null)) {
    return user;
  }

  const tokens = await refreshTokens();
  if (!tokens) {
    clearAuth();
    return null;
  }
  setAuthTokens(tokens.accessToken, tokens.refreshToken, getStoredOrgId() ?? undefined);
  return fetchMe(tokens.accessToken);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const u = await fetchMeWithRefresh();
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    window.location.href = "/signin";
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (getAccessToken()) {
        refetch().finally(() => {
          if (!cancelled) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    };
    run();
    const onTokensSet = () => {
      setLoading(true);
      refetch().finally(() => {
        if (!cancelled) setLoading(false);
      });
    };
    window.addEventListener("hrms:auth-tokens-set", onTokensSet);
    return () => {
      cancelled = true;
      window.removeEventListener("hrms:auth-tokens-set", onTokensSet);
    };
  }, [refetch]);

  const value: AuthContextValue = {
    user,
    loading,
    refetch,
    logout,
    isAuthenticated: !!user?.isActive
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext);
}
