const ACCESS_TOKEN_KEY = "hrms_access_token";
const REFRESH_TOKEN_KEY = "hrms_refresh_token";
const ORG_ID_KEY = "hrms_org_id";

export function setAuthTokens(accessToken: string, refreshToken: string, orgId?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (orgId) localStorage.setItem(ORG_ID_KEY, orgId);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredOrgId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ORG_ID_KEY);
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ORG_ID_KEY);
}

export function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
