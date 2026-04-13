import mongoose, { Document, Model, Schema } from "mongoose";
import { Role } from "@/types/roles";

export interface IOrgMember extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  role: Role.ORG_ADMIN | Role.ORG_STAFF;
  invitedBy?: mongoose.Types.ObjectId;
  inviteToken?: string;
  inviteTokenExpiry?: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrgMemberSchema = new Schema<IOrgMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    role: {
      type: String,
      enum: [Role.ORG_ADMIN, Role.ORG_STAFF],
      required: true,
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    inviteToken: { type: String },
    inviteTokenExpiry: { type: Date },
    acceptedAt: { type: Date },
  },
  { timestamps: true }
);

OrgMemberSchema.index({ orgId: 1, userId: 1 }, { unique: true });
OrgMemberSchema.index({ inviteToken: 1 });

export const OrgMember: Model<IOrgMember> =
  mongoose.models.OrgMember ??
  mongoose.model<IOrgMember>("OrgMember", OrgMemberSchema);
