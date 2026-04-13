import mongoose, { Document, Model, Schema } from "mongoose";

export interface SectionPrice {
  sectionId: string;
  sectionName: string;
  price: number;
  currency: "CRC" | "USD";
  capacity?: number;
}

export type EventStatus = "draft" | "published" | "closed" | "cancelled";

export interface IEvent extends Document {
  _id: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  date: Date;
  timezone: string;
  locationName: string;
  locationAddress?: string;
  layoutJson?: object;
  layoutVersion?: number;
  sectionPrices: SectionPrice[];
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SectionPriceSchema = new Schema<SectionPrice>(
  {
    sectionId: { type: String, required: true },
    sectionName: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["CRC", "USD"], default: "CRC" },
    capacity: { type: Number },
  },
  { _id: false }
);

const EventSchema = new Schema<IEvent>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: String,
    coverImageUrl: String,
    date: { type: Date, required: true },
    timezone: { type: String, default: "America/Costa_Rica" },
    locationName: { type: String, required: true },
    locationAddress: String,
    layoutJson: { type: Schema.Types.Mixed },
    layoutVersion: { type: Number, default: 1 },
    sectionPrices: [SectionPriceSchema],
    status: {
      type: String,
      enum: ["draft", "published", "closed", "cancelled"],
      default: "draft",
    },
  },
  { timestamps: true }
);

EventSchema.index({ orgId: 1, status: 1 });
EventSchema.index({ orgId: 1, slug: 1 }, { unique: true });
EventSchema.index({ date: 1 });

export const Event: Model<IEvent> =
  mongoose.models.Event ?? mongoose.model<IEvent>("Event", EventSchema);
