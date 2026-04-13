import { Role, Resource, Action } from "@/types/roles";

type PermissionMatrix = Partial<Record<Role, Partial<Record<Resource, Action[]>>>>;

const PERMISSIONS: PermissionMatrix = {
  [Role.SUPERADMIN]: {
    platform: ["manage"],
    organization: ["create", "read", "update", "delete", "manage"],
    event: ["create", "read", "update", "delete", "manage"],
    ticket: ["create", "read", "update", "delete", "manage"],
    member: ["create", "read", "update", "delete", "manage"],
    layout: ["create", "read", "update", "delete", "manage"],
    order: ["create", "read", "update", "delete", "manage"],
    scan: ["create", "read", "update", "delete", "manage"],
    report: ["read", "manage"],
  },
  [Role.ORG_ADMIN]: {
    organization: ["read", "update"],
    event: ["create", "read", "update", "delete"],
    ticket: ["create", "read", "update", "delete"],
    member: ["create", "read", "update", "delete"],
    layout: ["create", "read", "update", "delete"],
    order: ["create", "read", "update", "delete"],
    scan: ["create", "read"],
    report: ["read"],
  },
  [Role.ORG_STAFF]: {
    event: ["read"],
    ticket: ["create", "read", "update"],
    order: ["create", "read"],
    scan: ["create", "read"],
    layout: ["read"],
  },
  [Role.CUSTOMER]: {
    event: ["read"],
    ticket: ["read"],
    order: ["create", "read"],
  },
};

export function hasPermission(
  role: Role,
  resource: Resource,
  action: Action
): boolean {
  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return false;
  const resourcePerms = rolePerms[resource];
  if (!resourcePerms) return false;
  return resourcePerms.includes(action) || resourcePerms.includes("manage" as Action);
}

export function assertPermission(
  role: Role,
  resource: Resource,
  action: Action
): void {
  if (!hasPermission(role, resource, action)) {
    throw new Error(
      `Role '${role}' does not have permission to '${action}' on '${resource}'`
    );
  }
}
