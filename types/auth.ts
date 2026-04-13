import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";
import { Role } from "./roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      orgId?: string;
      orgSlug?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: Role;
    orgId?: string;
    orgSlug?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    orgId?: string;
    orgSlug?: string;
  }
}
