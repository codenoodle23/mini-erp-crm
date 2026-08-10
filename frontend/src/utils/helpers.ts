import { type AuthUser, type Role } from "../types";

/** Mirrors the backend's requireRole: ADMIN can always do everything. */
export function can(user: AuthUser | null, ...roles: Role[]): boolean {
  if (!user) return false;
  return user.role === "ADMIN" || roles.includes(user.role);
}

export function formatCurrency(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
