import mongoose, { Document, Model, Schema } from "mongoose";
import { TicketState } from "@/types/ticket";

export interface ITicket extends Document {
  _id: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  sectionId: string;
  sectionName: string;
  seatId?: string; // null for GA tickets
  seatLabel?: string; // e.g. "Mesa 5, Silla 3"
  attendeeName?: string;
  price: number;
  currency: "CRC" | "USD";
  state: TicketState;
  qrHmac?: string; // signed QR payload, set on ISSUED
  reservedAt?: Date;
  issuedAt?: Date;
  claimedAt?: Date;
  scannedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    sectionId: { type: String, required: true },
    sectionName: { type: String, required: true },
    seatId: String,
    seatLabel: String,
    attendeeName: String,
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["CRC", "USD"], default: "CRC" },
    state: {
      type: String,
      enum: Object.values(TicketState),
      default: TicketState.AVAILABLE,
      required: true,
    },
    qrHmac: String,
    reservedAt: Date,
    issuedAt: Date,
    claimedAt: Date,
    scannedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true }
);

TicketSchema.index({ orgId: 1, eventId: 1, state: 1 });
TicketSchema.index({ orgId: 1, orderId: 1 });
TicketSchema.index({ seatId: 1, eventId: 1 });
TicketSchema.index({ qrHmac: 1 });

export const Ticket: Model<ITicket> =
  mongoose.models.Ticket ?? mongoose.model<ITicket>("Ticket", TicketSchema);
