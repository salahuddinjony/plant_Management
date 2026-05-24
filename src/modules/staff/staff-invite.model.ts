import { model, Schema } from "mongoose";
import { STAFF_ROLE_SLUGS } from "../rbac/staff-role.constants";

export type TStaffInvite = {
    name: string;
    emailOrPhone: string;
    channel: "email" | "sms";
    staffRole: (typeof STAFF_ROLE_SLUGS)[number];
    permissions: string[];
    inviteTokenHash: string;
    inviteCodeHash: string;
    expiresAt: Date;
    invitedBy: Schema.Types.ObjectId;
    isUsed: boolean;
    acceptedAt?: Date | null;
    acceptedVia?: "invite" | "admin" | "self" | null;
    userId?: Schema.Types.ObjectId;
};

const StaffInviteSchema = new Schema<TStaffInvite>(
    {
        name: { type: String, required: true, trim: true },
        emailOrPhone: { type: String, required: true, trim: true, index: true },
        channel: { type: String, enum: ["email", "sms"], required: true },
        staffRole: { type: String, enum: STAFF_ROLE_SLUGS, required: true },
        permissions: { type: [String], default: [] },
        inviteTokenHash: { type: String, required: true, select: false },
        inviteCodeHash: { type: String, required: true, select: false },
        expiresAt: { type: Date, required: true },
        invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        isUsed: { type: Boolean, default: false, index: true },
        acceptedAt: { type: Date, default: null },
        acceptedVia: {
            type: String,
            enum: ["invite", "admin", "self"],
            default: null,
        },
        userId: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

StaffInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const StaffInviteModel = model<TStaffInvite>("staff_invite", StaffInviteSchema);
