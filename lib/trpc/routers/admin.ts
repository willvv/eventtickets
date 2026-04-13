import { z } from "zod";
import { router, superAdminProcedure } from "@/lib/trpc/server";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { Event } from "@/models/Event";
import { Ticket } from "@/models/Ticket";
import { AuditLog } from "@/models/AuditLog";

export const adminRouter = router({
  platformMetrics: superAdminProcedure.query(async () => {
    const [totalOrgs, totalUsers, totalEvents, totalTickets] = await Promise.all([
      Organization.countDocuments(),
      User.countDocuments(),
      Event.countDocuments(),
      Ticket.countDocuments(),
    ]);
    return { totalOrgs, totalUsers, totalEvents, totalTickets };
  }),

  listOrganizations: superAdminProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }).optional())
    .query(async ({ input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const [orgs, total] = await Promise.all([
        Organization.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        Organization.countDocuments(),
      ]);
      return { orgs, total, page, limit };
    }),

  listUsers: superAdminProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }).optional())
    .query(async ({ input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const [users, total] = await Promise.all([
        User.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        User.countDocuments(),
      ]);
      return { users, total, page, limit };
    }),

  impersonate: superAdminProcedure
    .input(z.object({ orgId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const org = await Organization.findById(input.orgId);
      if (!org) throw new Error("Organización no encontrada");

      await AuditLog.create({
        orgId: input.orgId,
        actorId: ctx.session.user.id,
        actorRole: ctx.session.user.role,
        action: "superadmin.impersonate",
        resourceType: "organization",
        resourceId: input.orgId,
      });

      return { org };
    }),

  auditLog: superAdminProcedure
    .input(z.object({ orgId: z.string().optional(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const filter: Record<string, unknown> = {};
      if (input.orgId) filter.orgId = input.orgId;
      return AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .limit(input.limit)
        .populate("actorId", "name email");
    }),
});
