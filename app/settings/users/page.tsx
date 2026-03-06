"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Table, TBody, THead, TH, TD } from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { getAccessToken } from "@/lib/auth/client-tokens";
import { ROLES } from "@/lib/auth/roles";
import { ROLE_LABELS } from "@/lib/auth/roles";

type UserRow = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

const ROLES_CREATABLE = [
  ROLES.EMPLOYEE,
  ROLES.MANAGER,
  ROLES.HRBP,
  ROLES.PAYROLL_MANAGER,
  ROLES.HRMS_ADMIN
] as const;

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500";

export default function SettingsUsersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [listLoading, setListLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<string>(ROLES.EMPLOYEE);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const roleLabel = (r: string) => (ROLE_LABELS as Record<string, string>)[r] ?? r;

  const fetchUsers = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !user?.orgId) return;
    setListLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
      });
      const res = await fetch(`/api/v1/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      if (!res.ok) {
        if (res.status === 403) {
          router.replace("/dashboard");
          return;
        }
        throw new Error("Failed to load users");
      }
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setUsers([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  }, [user?.orgId, page, pageSize, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/signin");
      return;
    }
    if ((user.role ?? "").toUpperCase() !== ROLES.SUPER_ADMIN) {
      router.replace("/dashboard");
      return;
    }
    fetchUsers();
  }, [authLoading, user, router, fetchUsers]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    if (password.length < 8) {
      setCreateError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setCreateError("Passwords do not match");
      return;
    }
    const token = getAccessToken();
    if (!token) {
      router.replace("/signin");
      return;
    }
    setCreateLoading(true);
    fetch("/api/v1/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
        role: role as (typeof ROLES_CREATABLE)[number]
      })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message ?? "Failed to create user");
        }
        setCreateSuccess("User created. They can sign in now.");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setRole(ROLES.EMPLOYEE);
        fetchUsers();
      })
      .catch((err: Error) => {
        setCreateError(err.message);
      })
      .finally(() => {
        setCreateLoading(false);
      });
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  if ((user.role ?? "").toUpperCase() !== ROLES.SUPER_ADMIN) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <DashboardLayout title="User management" subtitle="Create and manage profile users">
      <div className="space-y-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Settings
        </Link>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus size={20} />
                Create user
              </CardTitle>
              <CardDescription>Add a new user with email, password, and role.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label htmlFor="create-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    id="create-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={inputClass}
                    placeholder="user@company.com"
                  />
                </div>
                <div>
                  <label htmlFor="create-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    id="create-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className={inputClass}
                    placeholder="••••••••"
                  />
                  <p className="mt-1 text-xs text-slate-500">At least 8 characters</p>
                </div>
                <div>
                  <label htmlFor="create-confirm" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Confirm password
                  </label>
                  <input
                    id="create-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES_CREATABLE.map((r) => (
                        <SelectItem key={r} value={r}>
                          {roleLabel(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {createError && (
                  <p className="text-sm text-rose-600" role="alert">
                    {createError}
                  </p>
                )}
                {createSuccess && (
                  <p className="text-sm text-emerald-600" role="status">
                    {createSuccess}
                  </p>
                )}
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? "Creating…" : "Create user"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>All users in your organization ({total} total)</CardDescription>
            </CardHeader>
            <CardContent>
              {listLoading ? (
                <p className="text-sm text-slate-500">Loading users…</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-slate-500">No users yet. Create one above.</p>
              ) : (
                <>
                  <Table>
                    <THead>
                      <tr>
                        <TH>Email</TH>
                        <TH>Role</TH>
                        <TH>Status</TH>
                        <TH>Created</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-slate-100">
                          <TD className="font-medium">{u.email}</TD>
                          <TD>{roleLabel(u.role)}</TD>
                          <TD>
                            <span
                              className={
                                u.isActive
                                  ? "text-emerald-600"
                                  : "text-slate-400"
                              }
                            >
                              {u.isActive ? "Active" : "Inactive"}
                            </span>
                          </TD>
                          <TD className="text-slate-500">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </TD>
                        </tr>
                      ))}
                    </TBody>
                  </Table>
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        Page {page} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
