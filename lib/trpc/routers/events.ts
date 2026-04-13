import { z } from "zod";
import { router, orgMemberProcedure, orgAdminProcedure, publicProcedure } from "@/lib/trpc/server";
import { Event } from "@/models/Event";
import { slugify } from "@/lib/utils/slugify";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

const eventSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  date: z.date(),
  timezone: z.string().default("America/Costa_Rica"),
  locationName: z.string().min(2),
  locationAddress: z.string().optional(),
  sectionPrices: z.array(
    z.object({
      sectionId: z.string(),
      sectionName: z.string(),
      price: z.number().min(0),
      currency: z.enum(["CRC", "USD"]).default("CRC"),
      capacity: z.number().optional(),
    })
  ).optional(),
});

export const eventsRouter = router({
  listPublished: publicProcedure
    .input(z.object({ orgId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const filter: Record<string, unknown> = { status: "published" };
      if (input?.orgId) filter.orgId = input.orgId;
      return Event.find(filter).sort({ date: 1 });
    }),

  getBySlug: publicProcedure
    .input(z.object({ orgId: z.string(), slug: z.string() }))
    .query(async ({ input }) => {
      const event = await Event.findOne({ orgId: input.orgId, slug: input.slug });
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });
      return event;
    }),

  listByOrg: orgMemberProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "superadmin" && ctx.session.user.orgId !== input.orgId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return Event.find({ orgId: input.orgId }).sort({ createdAt: -1 });
    }),

  getById: orgMemberProcedure
    .input(z.object({ eventId: z.string(), orgId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "superadmin" && ctx.session.user.orgId !== input.orgId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const event = await Event.findOne({ _id: input.eventId, orgId: input.orgId });
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });
      return event;
    }),

  create: orgAdminProcedure
    .input(z.object({ orgId: z.string(), data: eventSchema }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "superadmin" && ctx.session.user.orgId !== input.orgId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const slug = slugify(input.data.title);
      const existing = await Event.findOne({ orgId: input.orgId, slug });
      const finalSlug = existing ? `${slug}-${nanoid(4)}` : slug;
      return Event.create({ ...input.data, orgId: input.orgId, slug: finalSlug });
    }),

  update: orgAdminProcedure
    .input(z.object({ eventId: z.string(), orgId: z.string(), data: eventSchema.partial() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "superadmin" && ctx.session.user.orgId !== input.orgId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return Event.findOneAndUpdate(
        { _id: input.eventId, orgId: input.orgId },
        input.data,
        { new: true }
      );
    }),

  updateStatus: orgAdminProcedure
    .input(z.object({
      eventId: z.string(),
      orgId: z.string(),
      status: z.enum(["draft", "published", "closed", "cancelled"]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "superadmin" && ctx.session.user.orgId !== input.orgId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return Event.findOneAndUpdate(
        { _id: input.eventId, orgId: input.orgId },
        { status: input.status },
        { new: true }
      );
    }),

  saveLayout: orgAdminProcedure
    .input(z.object({
      eventId: z.string(),
      orgId: z.string(),
      layoutJson: z.record(z.unknown()),
      layoutVersion: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "superadmin" && ctx.session.user.orgId !== input.orgId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return Event.findOneAndUpdate(
        { _id: input.eventId, orgId: input.orgId },
        { layoutJson: input.layoutJson, layoutVersion: input.layoutVersion },
        { new: true }
      );
    }),
});
