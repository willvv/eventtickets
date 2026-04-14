import { z } from "zod";
import { router, orgMemberProcedure, protectedProcedure, publicProcedure } from "@/lib/trpc/server";
import { Ticket } from "@/models/Ticket";
import { Order } from "@/models/Order";
import { Event } from "@/models/Event";
import { ClaimToken } from "@/models/ClaimToken";
import { AuditLog } from "@/models/AuditLog";
import { transitionTicket } from "@/lib/tickets/state-machine";
import { signTicketQr } from "@/lib/tickets/qr-signing";
import { verifyTicketQr } from "@/lib/tickets/qr-signing";
import { generateClaimToken, hashToken, isTokenExpired } from "@/lib/tickets/claim-token";
import { getTokenExpiryDate } from "@/lib/tickets/claim-token";
import { withTransaction } from "@/lib/db/transaction";
import { TicketState, TicketAction } from "@/types/ticket";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import mongoose from "mongoose";

export const ticketsRouter = router({
  // Reserve seats — public, no login required
  reserve: publicProcedure
    .input(z.object({
      eventId: z.string(),
      orgId: z.string(),
      seats: z.array(z.object({
        sectionId: z.string(),
        sectionName: z.string(),
        seatId: z.string().optional(),
        seatLabel: z.string().optional(),
        attendeeName: z.string().optional(),
        price: z.number(),
        currency: z.enum(["CRC", "USD"]).default("CRC"),
      })),
      paymentMethodId: z.string(),
      customerName: z.string().min(1, "El nombre es requerido"),
      customerPhone: z.string().min(8, "El teléfono es requerido"),
      customerEmail: z.string().email().optional(),
      paymentNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return withTransaction(async (session) => {
        const event = await Event.findOne({
          _id: input.eventId,
          orgId: input.orgId,
          status: "published",
        }).session(session);

        if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Evento no encontrado" });

        const org = await mongoose.model("Organization").findById(input.orgId).session(session);
        const paymentMethod = org?.paymentMethods.find((m: any) => m.id === input.paymentMethodId);
        if (!paymentMethod) throw new TRPCError({ code: "BAD_REQUEST", message: "Método de pago inválido" });

        const totalAmount = input.seats.reduce((sum, s) => sum + s.price, 0);
        const reservedUntil = new Date(
          Date.now() + (org?.reservationTtlMinutes ?? 360) * 60 * 1000
        );

        const userId = ctx.session?.user?.id ?? undefined;

        const order = await Order.create([{
          orgId: input.orgId,
          eventId: input.eventId,
          userId,
          customerName: input.customerName,
          customerEmail: input.customerEmail ?? ctx.session?.user?.email,
          customerPhone: input.customerPhone,
          paymentMethodId: input.paymentMethodId,
          paymentMethodType: paymentMethod.type,
          paymentNotes: input.paymentNotes,
          totalAmount,
          currency: input.seats[0]?.currency ?? "CRC",
          status: "reserved",
          reservedUntil,
        }], { session });

        const tickets = await Ticket.insertMany(
          input.seats.map((seat) => ({
            orgId: input.orgId,
            eventId: input.eventId,
            orderId: order[0]._id,
            userId,
            sectionId: seat.sectionId,
            sectionName: seat.sectionName,
            seatId: seat.seatId,
            seatLabel: seat.seatLabel,
            attendeeName: seat.attendeeName,
            price: seat.price,
            currency: seat.currency,
            state: TicketState.RESERVED,
            reservedAt: new Date(),
          })),
          { session, ordered: true }
        );

        return { order: order[0], tickets };
      });
    }),

  // Issue tickets (mark as paid and generate QR)
  issue: orgMemberProcedure
    .input(z.object({
      orderId: z.string(),
      orgId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return withTransaction(async (session) => {
        const order = await Order.findOne({ _id: input.orderId, orgId: input.orgId }).session(session);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });
        if (order.status !== "reserved" && order.status !== "paid") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "La orden no está en estado válido para emitir" });
        }

        const tickets = await Ticket.find({ orderId: input.orderId, orgId: input.orgId }).session(session);

        const updatedTickets = [];
        for (const ticket of tickets) {
          const result = transitionTicket(ticket.state as TicketState, TicketAction.ISSUE, {
            paymentConfirmed: true,
          });
          if (!result.success) continue;

          const qrPayload = {
            ticketId: ticket._id.toString(),
            eventId: ticket.eventId.toString(),
            orgId: ticket.orgId.toString(),
            issuedAt: Date.now(),
            nonce: nanoid(8),
          };
          const qrHmac = signTicketQr(qrPayload);

          const { raw, hashed } = generateClaimToken();
          await ClaimToken.create([{
            hashedToken: hashed,
            ticketId: ticket._id,
            orderId: input.orderId,
            orgId: input.orgId,
            expiresAt: getTokenExpiryDate(),
          }], { session });

          const updated = await Ticket.findByIdAndUpdate(
            ticket._id,
            {
              state: TicketState.ISSUED,
              qrHmac,
              issuedAt: new Date(),
            },
            { new: true, session }
          );
          updatedTickets.push({ ticket: updated, claimToken: raw });
        }

        await Order.findByIdAndUpdate(
          input.orderId,
          { status: "issued", paidAt: new Date() },
          { session }
        );

        await AuditLog.create([{
          orgId: input.orgId,
          actorId: ctx.session.user.id,
          actorRole: ctx.session.user.role,
          action: "ticket.issue",
          resourceType: "order",
          resourceId: input.orderId,
        }], { session });

        return updatedTickets;
      });
    }),

  // Scan a ticket via QR code
  scan: orgMemberProcedure
    .input(z.object({
      qrString: z.string(),
      orgId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return withTransaction(async (session) => {
        const { valid, payload, error } = verifyTicketQr(input.qrString);
        if (!valid || !payload) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error ?? "QR inválido" });
        }

        if (payload.orgId !== input.orgId && ctx.session.user.role !== "superadmin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const ticket = await Ticket.findById(payload.ticketId).session(session);
        if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Entrada no encontrada" });

        if (ticket.state === TicketState.SCANNED) {
          return { alreadyScanned: true, ticket };
        }

        const result = transitionTicket(ticket.state as TicketState, TicketAction.SCAN, {
          validQr: true,
        });
        if (!result.success) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }

        await Ticket.findByIdAndUpdate(
          ticket._id,
          { state: TicketState.SCANNED, scannedAt: new Date() },
          { session }
        );

        // Check for group order
        const groupTickets = await Ticket.find({
          orderId: ticket.orderId,
          state: { $in: [TicketState.ISSUED, TicketState.CLAIMED] },
          _id: { $ne: ticket._id },
        }).session(session);

        await AuditLog.create([{
          orgId: input.orgId,
          actorId: ctx.session.user.id,
          actorRole: ctx.session.user.role,
          action: "ticket.scan",
          resourceType: "ticket",
          resourceId: ticket._id.toString(),
        }], { session });

        return {
          alreadyScanned: false,
          ticket,
          groupTickets: groupTickets.map((t) => ({
            id: t._id.toString(),
            seatLabel: t.seatLabel,
            attendeeName: t.attendeeName,
          })),
        };
      });
    }),

  // Scan all tickets in a group order
  scanGroup: orgMemberProcedure
    .input(z.object({ orderId: z.string(), orgId: z.string() }))
    .mutation(async ({ input }) => {
      return withTransaction(async (session) => {
        const tickets = await Ticket.find({
          orderId: input.orderId,
          orgId: input.orgId,
          state: { $in: [TicketState.ISSUED, TicketState.CLAIMED] },
        }).session(session);

        await Ticket.updateMany(
          {
            orderId: input.orderId,
            orgId: input.orgId,
            state: { $in: [TicketState.ISSUED, TicketState.CLAIMED] },
          },
          { state: TicketState.SCANNED, scannedAt: new Date() },
          { session }
        );

        return { scannedCount: tickets.length };
      });
    }),

  // Claim tickets via token link
  claimByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const hashed = hashToken(input.token);
      const claimToken = await ClaimToken.findOne({ hashedToken: hashed })
        .populate("ticketId")
        .populate("orderId");

      if (!claimToken) throw new TRPCError({ code: "NOT_FOUND", message: "Enlace inválido" });
      if (isTokenExpired(claimToken.expiresAt)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Enlace expirado" });
      }
      if (claimToken.usedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Enlace ya utilizado" });
      }

      return {
        ticket: claimToken.ticketId,
        order: claimToken.orderId,
        canClaim: true,
      };
    }),

  consumeClaim: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      return withTransaction(async (session) => {
        const hashed = hashToken(input.token);
        const claimToken = await ClaimToken.findOneAndUpdate(
          { hashedToken: hashed, usedAt: null },
          { usedAt: new Date() },
          { new: true, session }
        );

        if (!claimToken) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Enlace ya utilizado o inválido" });
        }

        if (isTokenExpired(claimToken.expiresAt)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Enlace expirado" });
        }

        await Ticket.findByIdAndUpdate(
          claimToken.ticketId,
          { state: TicketState.CLAIMED, claimedAt: new Date() },
          { session }
        );

        return { success: true };
      });
    }),

  // Cancel a ticket
  cancel: orgMemberProcedure
    .input(z.object({ ticketId: z.string(), orgId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return withTransaction(async (session) => {
        const ticket = await Ticket.findOne({ _id: input.ticketId, orgId: input.orgId }).session(session);
        if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });

        const result = transitionTicket(ticket.state as TicketState, TicketAction.CANCEL, {
          role: ctx.session.user.role,
        });
        if (!result.success) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }

        await Ticket.findByIdAndUpdate(
          ticket._id,
          { state: TicketState.CANCELLED, cancelledAt: new Date() },
          { session }
        );

        await AuditLog.create([{
          orgId: input.orgId,
          actorId: ctx.session.user.id,
          actorRole: ctx.session.user.role,
          action: "ticket.cancel",
          resourceType: "ticket",
          resourceId: input.ticketId,
        }], { session });

        return { success: true };
      });
    }),

  listByEvent: orgMemberProcedure
    .input(z.object({
      eventId: z.string(),
      orgId: z.string(),
      state: z.nativeEnum(TicketState).optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "superadmin" && ctx.session.user.orgId !== input.orgId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const filter: Record<string, unknown> = { eventId: input.eventId, orgId: input.orgId };
      if (input.state) filter.state = input.state;
      return Ticket.find(filter).sort({ createdAt: -1 });
    }),

  listByUser: protectedProcedure.query(async ({ ctx }) => {
    return Ticket.find({ userId: ctx.session.user.id })
      .populate("eventId")
      .sort({ createdAt: -1 });
  }),

  getOrderWithTickets: publicProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input }) => {
      const order = await Order.findById(input.orderId).populate("eventId").lean();
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      const tickets = await Ticket.find({ orderId: input.orderId }).lean();
      // Fetch org for payment method details
      const org = await mongoose.model("Organization").findById((order as any).orgId).lean();
      const paymentMethod = (org as any)?.paymentMethods?.find(
        (m: any) => m.id === (order as any).paymentMethodId
      );
      return { order, tickets, paymentMethod };
    }),

  // Admin creates an order directly (can auto-emit + mark complimentary)
  createAdminOrder: orgMemberProcedure
    .input(z.object({
      eventId: z.string(),
      orgId: z.string(),
      customerName: z.string().min(1),
      customerPhone: z.string().min(6),
      customerEmail: z.string().email().optional(),
      paymentMethodId: z.string().optional(),
      paymentNotes: z.string().optional(),
      isComplimentary: z.boolean().default(false),
      autoIssue: z.boolean().default(false),
      seats: z.array(z.object({
        sectionId: z.string(),
        sectionName: z.string(),
        seatLabel: z.string().optional(),
        price: z.number().min(0),
        currency: z.enum(["CRC", "USD"]).default("CRC"),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "superadmin" && ctx.session.user.orgId !== input.orgId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return withTransaction(async (session) => {
        const event = await Event.findOne({ _id: input.eventId, orgId: input.orgId }).session(session);
        if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Evento no encontrado" });

        const org = await mongoose.model("Organization").findById(input.orgId).session(session);

        // For complimentary tickets, price is always 0
        const seats = input.seats.map((s) => ({
          ...s,
          price: input.isComplimentary ? 0 : s.price,
        }));
        const totalAmount = seats.reduce((sum, s) => sum + s.price, 0);

        // Use first payment method if none specified and not complimentary
        let paymentMethodId = input.paymentMethodId;
        let paymentMethod: any = null;
        if (input.isComplimentary) {
          // Create a virtual complimentary payment method entry
          paymentMethodId = "complimentary";
        } else {
          paymentMethod = org?.paymentMethods?.find((m: any) => m.id === paymentMethodId);
          if (!paymentMethod) throw new TRPCError({ code: "BAD_REQUEST", message: "Método de pago inválido" });
        }

        const order = await Order.create([{
          orgId: input.orgId,
          eventId: input.eventId,
          userId: ctx.session.user.id,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          paymentMethodId: paymentMethodId ?? "admin",
          paymentMethodType: input.isComplimentary ? "other" : (paymentMethod?.type ?? "other"),
          paymentNotes: input.isComplimentary ? "Cortesía" : input.paymentNotes,
          totalAmount,
          currency: seats[0]?.currency ?? "CRC",
          status: "reserved",
        }], { session });

        const tickets = await Ticket.insertMany(
          seats.map((seat) => ({
            orgId: input.orgId,
            eventId: input.eventId,
            orderId: order[0]._id,
            sectionId: seat.sectionId,
            sectionName: seat.sectionName,
            seatLabel: seat.seatLabel,
            price: seat.price,
            currency: seat.currency,
            isComplimentary: input.isComplimentary,
            state: TicketState.RESERVED,
            reservedAt: new Date(),
          })),
          { session, ordered: true }
        );

        let issuedTickets: any[] = [];
        if (input.autoIssue) {
          // Issue all tickets immediately
          for (const ticket of tickets) {
            const qrPayload = {
              ticketId: ticket._id.toString(),
              eventId: ticket.eventId.toString(),
              orgId: ticket.orgId.toString(),
              issuedAt: Date.now(),
              nonce: nanoid(8),
            };
            const qrHmac = signTicketQr(qrPayload);
            await Ticket.findByIdAndUpdate(ticket._id, { state: TicketState.ISSUED, qrHmac, issuedAt: new Date() }, { session });
            issuedTickets.push({ ...ticket.toObject(), qrHmac, state: TicketState.ISSUED });
          }
          await Order.findByIdAndUpdate(order[0]._id, { status: "issued", paidAt: new Date() }, { session });

          await AuditLog.create([{
            orgId: input.orgId,
            actorId: ctx.session.user.id,
            actorRole: ctx.session.user.role,
            action: "ticket.adminCreate",
            resourceType: "order",
            resourceId: order[0]._id.toString(),
            metadata: { isComplimentary: input.isComplimentary, autoIssue: true },
          }], { session });
        }

        return { order: order[0], tickets: input.autoIssue ? issuedTickets : tickets };
      });
    }),

  cancelOrder: orgMemberProcedure
    .input(z.object({ orderId: z.string(), orgId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      return withTransaction(async (session) => {
        const order = await Order.findOne({ _id: input.orderId, orgId: input.orgId }).session(session);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });
        if (order.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "Orden ya cancelada" });

        await Order.findByIdAndUpdate(input.orderId, { status: "cancelled" }, { session });
        await Ticket.updateMany(
          { orderId: input.orderId, orgId: input.orgId, state: { $nin: [TicketState.SCANNED] } },
          { state: TicketState.CANCELLED, cancelledAt: new Date() },
          { session }
        );

        await AuditLog.create([{
          orgId: input.orgId,
          actorId: ctx.session.user.id,
          actorRole: ctx.session.user.role,
          action: "order.cancel",
          resourceType: "order",
          resourceId: input.orderId,
          metadata: { reason: input.reason },
        }], { session });

        return { success: true };
      });
    }),

  getEventStats: orgMemberProcedure
    .input(z.object({ eventId: z.string(), orgId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "superadmin" && ctx.session.user.orgId !== input.orgId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const pipeline = [
        { $match: { eventId: new mongoose.Types.ObjectId(input.eventId), orgId: new mongoose.Types.ObjectId(input.orgId) } },
        { $group: { _id: "$state", count: { $sum: 1 }, revenue: { $sum: "$price" } } },
      ];
      const stats = await Ticket.aggregate(pipeline);
      return stats;
    }),
});
