import { model, Schema } from "mongoose";
import { USER_ROLE } from "../../constants/status.constants";
import { TPendingSignup } from "./pending-signup.interface";

/** Pending registration expires after 30 minutes if OTP is not verified */
export const PENDING_SIGNUP_TTL_MS = 30 * 60 * 1000;

const PendingSignupSchema = new Schema<TPendingSignup>(
    {
        emailOrPhone: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        profilePicture: {
            type: String,
        },
        role: {
            type: String,
            enum: Object.values(USER_ROLE),
            default: USER_ROLE.USER,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
    },
    { timestamps: true }
);

PendingSignupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PendingSignupModel = model<TPendingSignup>(
    "pending_signup",
    PendingSignupSchema
);
