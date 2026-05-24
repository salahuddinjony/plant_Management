import { model, Schema } from "mongoose";
import { TPasswordResetSession } from "./password-reset-session.interface";

const PasswordResetSessionSchema = new Schema<TPasswordResetSession>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        resetTokenHash: {
            type: String,
            required: true,
            select: false,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        isUsed: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    { timestamps: true }
);

PasswordResetSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetSessionModel = model<TPasswordResetSession>(
    "password_reset_session",
    PasswordResetSessionSchema
);
