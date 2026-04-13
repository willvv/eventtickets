import mongoose, { Document, Model, Schema } from "mongoose";

export type AuditAction =
  | "ticket.issue"
  | "ticket.cancel"
  | "ticket.scan"
  | "ticket.claim"
  | "order.paid"
  | "order.refund"
  | "member.invite"
  | "member.role_change"
  | "member.remove"
  | "superadmin.impersonate"
  | "event.publish"
  | "event.cancel";

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  orgId?: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  actorRole: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization" },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ orgId: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ??
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
