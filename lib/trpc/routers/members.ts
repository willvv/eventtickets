import { z } from "zod";
import { router, orgAdminProcedure, superAdminProcedure } from "@/lib/trpc/server";
import { OrgMember } from "@/models/OrgMember";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";
import { TRPCError } from "@trpc/server";
import { Role } from "@/types/roles";
import crypto from "crypto";

export const membersRouter = router({
  listByOrg: orgAdminProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "superadmin" && ctx.session.user.orgId !== input.orgId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return OrgMember.find({ orgId: input.orgId }).populate("userId");
    }),

  invite: orgAdminProcedure
    .input(z.object({
      orgId: z.string(),
      email: z.string().email(),
      role: z.enum([Role.ORG_ADMIN, Role.ORG_STAFF]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "superadmin" && ctx.session.user.orgId !== input.orgId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      let user = await User.findOne({ email: input.email.toLowerCase() });
      if (!user) {
        user = await User.create({
          email: input.email.toLowerCase(),
          name: input.email.split("@")[0],
          role: input.role,
        });
      }

      const existingMember = await OrgMember.findOne({ userId: user._id, orgId: input.orgId });
      if (existingMember) {
        throw new TRPCError({ code: "CONFLICT", message: "El usuario ya es miembro de esta organización" });
      }

      const inviteToken = crypto.randomBytes(32).toString("hex");
      const inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const member = await OrgMember.create({
        userId: user._id,
        orgId: input.orgId,
        role: input.role,
        invitedBy: ctx.session.user.id,
        inviteToken,
        inviteTokenExpiry,
      });

      await AuditLog.create({
        orgId: input.orgId,
        actorId: ctx.session.user.id,
        actorRole: ctx.session.user.role,
        action: "member.invite",
        resourceType: "member",
        resourceId: member._id.toString(),
        metadata: { email: input.email, role: input.role },
      });

      // TODO: Send invitation email with inviteToken
      return { member, inviteToken };
    }),

  remove: orgAdminProcedure
    .input(z.object({ orgId: z.string(), memberId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "superadmin" && ctx.session.user.orgId !== input.orgId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await OrgMember.findOneAndDelete({ _id: input.memberId, orgId: input.orgId });

      await AuditLog.create({
        orgId: input.orgId,
        actorId: ctx.session.user.id,
        actorRole: ctx.session.user.role,
        action: "member.remove",
        resourceType: "member",
        resourceId: input.memberId,
      });

      return { success: true };
    }),

  changeRole: orgAdminProcedure
    .input(z.object({
      orgId: z.string(),
      memberId: z.string(),
      role: z.enum([Role.ORG_ADMIN, Role.ORG_STAFF]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "superadmin" && ctx.session.user.orgId !== input.orgId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const member = await OrgMember.findOneAndUpdate(
        { _id: input.memberId, orgId: input.orgId },
        { role: input.role },
        { new: true }
      );

      await AuditLog.create({
        orgId: input.orgId,
        actorId: ctx.session.user.id,
        actorRole: ctx.session.user.role,
        action: "member.role_change",
        resourceType: "member",
        resourceId: input.memberId,
        metadata: { newRole: input.role },
      });

      return member;
    }),
});
