import mongoose, { Document, Model, Schema } from "mongoose";

export type OrderStatus =
  | "pending"
  | "reserved"
  | "paid"
  | "issued"
  | "cancelled"
  | "refunded";

export type PaymentMethodType =
  | "cash"
  | "card"
  | "bank-transfer"
  | "mobile-payment"
  | "other";

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethodId: string;
  paymentMethodType: PaymentMethodType;
  paymentNotes?: string;
  paymentProofUrl?: string;
  totalAmount: number;
  currency: "CRC" | "USD";
  status: OrderStatus;
  reservedUntil?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    customerName: String,
    customerEmail: String,
    customerPhone: String,
    paymentMethodId: { type: String, required: true },
    paymentMethodType: {
      type: String,
      enum: ["cash", "card", "bank-transfer", "mobile-payment", "other"],
      required: true,
    },
    paymentNotes: String,
    paymentProofUrl: String,
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["CRC", "USD"], default: "CRC" },
    status: {
      type: String,
      enum: ["pending", "reserved", "paid", "issued", "cancelled", "refunded"],
      default: "pending",
    },
    reservedUntil: Date,
    paidAt: Date,
  },
  { timestamps: true }
);

OrderSchema.index({ orgId: 1, eventId: 1 });
OrderSchema.index({ orgId: 1, status: 1 });
OrderSchema.index({ userId: 1 });

export const Order: Model<IOrder> =
  mongoose.models.Order ?? mongoose.model<IOrder>("Order", OrderSchema);
