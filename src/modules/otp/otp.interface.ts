import { TOtpPurpose } from "./otp.constants";

export type TOtpChannel = "email" | "sms";

export type TOtp = {
    identifier: string;
    purpose: TOtpPurpose;
    channel: TOtpChannel;
    codeHash: string;
    expiresAt: Date;
    attempts: number;
    consumedAt?: Date | null;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
};
