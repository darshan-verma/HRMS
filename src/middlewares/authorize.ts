import { hasPermission } from "@/lib/auth/rbac";
import { NextResponse } from "next/server";

export function authorize(role: string, permission: Parameters<typeof hasPermission>[1]) {
  if (!hasPermission(role, permission)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  return null;
}
