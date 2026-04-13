import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { Role } from "@/types/roles";
import { AppError } from "@/lib/utils/api-error";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getRequiredSession() {
  const session = await getSession();
  if (!session?.user) {
    throw new AppError("UNAUTHORIZED", "Debe iniciar sesión", 401);
  }
  return session;
}

export async function assertRole(requiredRole: Role, allowedRoles?: Role[]) {
  const session = await getRequiredSession();
  const userRole = session.user.role;
  const allowed = allowedRoles ?? [requiredRole];
  if (!allowed.includes(userRole) && userRole !== Role.SUPERADMIN) {
    throw new AppError("FORBIDDEN", "No tiene permisos para esta acción", 403);
  }
  return session;
}

export async function getOrgSession() {
  const session = await getRequiredSession();
  if (!session.user.orgId) {
    throw new AppError("FORBIDDEN", "No está asociado a ninguna organización", 403);
  }
  return session as typeof session & {
    user: typeof session.user & { orgId: string; orgSlug: string };
  };
}
