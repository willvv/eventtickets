export enum Role {
  SUPERADMIN = "superadmin",
  ORG_ADMIN = "org_admin",
  ORG_STAFF = "org_staff",
  CUSTOMER = "customer",
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPERADMIN]: 4,
  [Role.ORG_ADMIN]: 3,
  [Role.ORG_STAFF]: 2,
  [Role.CUSTOMER]: 1,
};

export type Resource =
  | "organization"
  | "event"
  | "ticket"
  | "member"
  | "layout"
  | "order"
  | "scan"
  | "report"
  | "platform";

export type Action = "create" | "read" | "update" | "delete" | "manage";

export interface Permission {
  resource: Resource;
  action: Action;
}
