import mongoose, { Document, Model, Schema } from "mongoose";

export interface IClaimToken extends Document {
  _id: mongoose.Types.ObjectId;
  hashedToken: string;
  ticketId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

const ClaimTokenSchema = new Schema<IClaimToken>(
  {
    hashedToken: { type: String, required: true, unique: true },
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ClaimTokenSchema.index({ hashedToken: 1 });
ClaimTokenSchema.index({ ticketId: 1 });
ClaimTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export const ClaimToken: Model<IClaimToken> =
  mongoose.models.ClaimToken ??
  mongoose.model<IClaimToken>("ClaimToken", ClaimTokenSchema);
