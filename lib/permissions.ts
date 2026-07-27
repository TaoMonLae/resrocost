import type { Role } from "@prisma/client";

export const permissions = [
  "restaurant:manage",
  "team:manage",
  "records:delete",
  "ingredients:read",
  "ingredients:write",
  "recipes:read",
  "recipes:write",
  "menu:read",
  "menu:write",
  "purchases:write",
  "sales:write",
  "stock:use",
  "waste:write",
  "expenses:write",
  "reports:read",
  "reports:financial",
  "reports:export",
] as const;

export type Permission = (typeof permissions)[number];

const allPermissions = new Set<Permission>(permissions);

export const rolePermissions: Record<Role, ReadonlySet<Permission>> = {
  OWNER: allPermissions,
  MANAGER: new Set([
    "ingredients:read",
    "ingredients:write",
    "recipes:read",
    "recipes:write",
    "menu:read",
    "menu:write",
    "purchases:write",
    "sales:write",
    "stock:use",
    "waste:write",
    "reports:read",
  ]),
  KITCHEN_STAFF: new Set([
    "ingredients:read",
    "recipes:read",
    "menu:read",
    "stock:use",
    "waste:write",
  ]),
  ACCOUNTANT: new Set([
    "ingredients:read",
    "menu:read",
    "purchases:write",
    "expenses:write",
    "reports:read",
    "reports:financial",
    "reports:export",
  ]),
  VIEWER: new Set([
    "ingredients:read",
    "recipes:read",
    "menu:read",
    "reports:read",
  ]),
};

export function can(role: Role, permission: Permission) {
  return rolePermissions[role].has(permission);
}

export function assertPermission(role: Role, permission: Permission) {
  if (!can(role, permission)) {
    throw new Error(`Role ${role} cannot perform ${permission}`);
  }
}
