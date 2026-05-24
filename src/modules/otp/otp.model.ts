import { model, Schema } from "mongoose";
import { OTP_PURPOSES } from "./otp.constants";
import { TOtp } from "./otp.interface";

const OtpSchema = new Schema<TOtp>(
    {
        identifier: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        purpose: {
            type: String,
            enum: OTP_PURPOSES,
            required: true,
            index: true,
        },
        channel: {
            type: String,
            enum: ["email", "sms"],
            required: true,
        },
        codeHash: {
            type: String,
            required: true,
            select: false,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        attempts: {
            type: Number,
            default: 0,
            min: 0,
        },
        consumedAt: {
            type: Date,
            default: null,
        },
        userId: {
            type: String,
        },
    },
    { timestamps: true }
);

OtpSchema.index({ identifier: 1, purpose: 1, consumedAt: 1, createdAt: -1 });
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpModel = model<TOtp>("otp", OtpSchema);
