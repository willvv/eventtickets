import { z } from "zod";
import { router, orgAdminProcedure, superAdminProcedure, protectedProcedure } from "@/lib/trpc/server";
import { Organization } from "@/models/Organization";
import { OrgMember } from "@/models/OrgMember";
import { slugify } from "@/lib/utils/slugify";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  address: z.string().optional(),
  defaultCurrency: z.enum(["CRC", "USD"]).default("CRC"),
});

export const organizationsRouter = router({
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const org = await Organization.findOne({ slug: input.slug });
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });
      return org;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const org = await Organization.findById(input.id);
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });
      return org;
    }),

  listAll: superAdminProcedure.query(async () => {
    return Organization.find().sort({ createdAt: -1 });
  }),

  create: superAdminProcedure
    .input(createOrgSchema)
    .mutation(async ({ input }) => {
      const slug = slugify(input.name);
      const existing = await Organization.findOne({ slug });
      const finalSlug = existing ? `${slug}-${nanoid(4)}` : slug;
      return Organization.create({ ...input, slug: finalSlug });
    }),

  update: orgAdminProcedure
    .input(z.object({ orgId: z.string(), data: createOrgSchema.partial() }))
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.session.user.role !== "superadmin" &&
        ctx.session.user.orgId !== input.orgId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return Organization.findByIdAndUpdate(input.orgId, input.data, { new: true });
    }),

  suspend: superAdminProcedure
    .input(z.object({ orgId: z.string(), suspended: z.boolean() }))
    .mutation(async ({ input }) => {
      return Organization.findByIdAndUpdate(
        input.orgId,
        { isSuspended: input.suspended },
        { new: true }
      );
    }),

  addPaymentMethod: orgAdminProcedure
    .input(
      z.object({
        orgId: z.string(),
        method: z.object({
          name: z.string(),
          type: z.enum(["cash", "card", "bank-transfer", "mobile-payment", "other"]),
          instructions: z.string().optional(),
          accountDetails: z.string().optional(),
          requiresProof: z.boolean().default(false),
          availableInPublicPortal: z.boolean().default(false),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return Organization.findByIdAndUpdate(
        input.orgId,
        { $push: { paymentMethods: { ...input.method, id: nanoid(), isActive: true } } },
        { new: true }
      );
    }),
});
