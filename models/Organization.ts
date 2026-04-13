import mongoose, { Document, Model, Schema } from "mongoose";

export interface PaymentMethod {
  id: string;
  name: string;
  type: "cash" | "card" | "bank-transfer" | "mobile-payment" | "other";
  instructions?: string;
  accountDetails?: string; // e.g., SINPE phone number
  requiresProof: boolean;
  availableInPublicPortal: boolean;
  isActive: boolean;
}

export interface IOrganization extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  defaultCurrency: "CRC" | "USD";
  reservationTtlMinutes: number;
  paymentMethods: PaymentMethod[];
  isSuspended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentMethodSchema = new Schema<PaymentMethod>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["cash", "card", "bank-transfer", "mobile-payment", "other"],
      required: true,
    },
    instructions: String,
    accountDetails: String,
    requiresProof: { type: Boolean, default: false },
    availableInPublicPortal: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: String,
    logoUrl: String,
    phone: String,
    email: String,
    website: String,
    address: String,
    defaultCurrency: { type: String, enum: ["CRC", "USD"], default: "CRC" },
    reservationTtlMinutes: { type: Number, default: 360 },
    paymentMethods: [PaymentMethodSchema],
    isSuspended: { type: Boolean, default: false },
  },
  { timestamps: true }
);

OrganizationSchema.index({ slug: 1 });

export const Organization: Model<IOrganization> =
  mongoose.models.Organization ??
  mongoose.model<IOrganization>("Organization", OrganizationSchema);
