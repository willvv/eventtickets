import { initTRPC, TRPCError } from "@trpc/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { connectDB } from "@/lib/db/mongoose";
import superjson from "superjson";
import { Role } from "@/types/roles";
import { ZodError } from "zod";

export async function createTRPCContext() {
  await connectDB();
  const session = await getServerSession(authOptions);
  return { session };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

const isSuperAdmin = t.middleware(({ ctx, next }) => {
  if (ctx.session?.user?.role !== Role.SUPERADMIN) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx: { ...ctx, session: ctx.session! } });
});

const isOrgMember = t.middleware(({ ctx, next }) => {
  const role = ctx.session?.user?.role;
  if (
    role !== Role.ORG_ADMIN &&
    role !== Role.ORG_STAFF &&
    role !== Role.SUPERADMIN
  ) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx: { ...ctx, session: ctx.session! } });
});

const isOrgAdmin = t.middleware(({ ctx, next }) => {
  const role = ctx.session?.user?.role;
  if (role !== Role.ORG_ADMIN && role !== Role.SUPERADMIN) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx: { ...ctx, session: ctx.session! } });
});

export const protectedProcedure = t.procedure.use(isAuthed);
export const superAdminProcedure = t.procedure.use(isSuperAdmin);
export const orgMemberProcedure = t.procedure.use(isOrgMember);
export const orgAdminProcedure = t.procedure.use(isOrgAdmin);
