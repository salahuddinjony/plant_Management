import bcrypt from "bcryptjs";
import status from "http-status";
import AppError from "../../errors/AppError";
import {
    getIdentifierChannel,
    normalizeIdentifier,
} from "../../utils/identifierChannel.util";
import {
    OTP_EXPIRY_MS,
    OTP_MAX_SENDS_PER_WINDOW,
    OTP_MAX_VERIFY_ATTEMPTS,
    OTP_RATE_WINDOW_MS,
    TOtpPurpose,
} from "./otp.constants";
import { sendOtpNotification } from "./otp-notification.util";
import { OtpModel } from "./otp.model";

const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const getRateWindowStart = () => new Date(Date.now() - OTP_RATE_WINDOW_MS);

const assertSendRateLimit = async (identifier: string, purpose: TOtpPurpose) => {
    const recentSendCount = await OtpModel.countDocuments({
        identifier,
        purpose,
        createdAt: { $gte: getRateWindowStart() },
    });

    if (recentSendCount >= OTP_MAX_SENDS_PER_WINDOW) {
        throw new AppError(
            429,
            "Too many OTP requests. Please try again after 5 minutes."
        );
    }
};

const invalidateActiveOtps = async (identifier: string, purpose: TOtpPurpose) => {
    await OtpModel.updateMany(
        {
            identifier,
            purpose,
            consumedAt: null,
            expiresAt: { $gt: new Date() },
        },
        { $set: { consumedAt: new Date() } }
    );
};

const findActiveOtp = async (identifier: string, purpose: TOtpPurpose) => {
    return OtpModel.findOne({
        identifier,
        purpose,
        consumedAt: null,
        expiresAt: { $gt: new Date() },
    })
        .select("+codeHash")
        .sort({ createdAt: -1 });
};

export const createAndSendOtp = async ({
    identifier,
    purpose,
    userId,
    userName,
}: {
    identifier: string;
    purpose: TOtpPurpose;
    userId?: string;
    userName?: string;
}) => {
    const normalized = normalizeIdentifier(identifier);
    const channel = getIdentifierChannel(normalized);

    await assertSendRateLimit(normalized, purpose);
    await invalidateActiveOtps(normalized, purpose);

    const plainCode = generateOtpCode();
    const codeHash = await bcrypt.hash(plainCode, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await sendOtpNotification({
        identifier: normalized,
        channel,
        purpose,
        otp: plainCode,
        userName,
    });

    await OtpModel.create({
        identifier: normalized,
        purpose,
        channel,
        codeHash,
        expiresAt,
        attempts: 0,
        consumedAt: null,
        userId,
    });

    return {
        message: "OTP sent successfully",
        channel,
        expiresInMinutes: OTP_EXPIRY_MS / 60000,
    };
};

export const verifyOtp = async ({
    identifier,
    purpose,
    code,
    userId,
}: {
    identifier: string;
    purpose: TOtpPurpose;
    code: string;
    userId?: string;
}) => {
    const normalized = normalizeIdentifier(identifier);
    const trimmedCode = code.trim();

    if (!/^\d{6}$/.test(trimmedCode)) {
        throw new AppError(status.BAD_REQUEST, "OTP must be a 6-digit code");
    }

    const otpDoc = await findActiveOtp(normalized, purpose);

    if (!otpDoc) {
        throw new AppError(status.BAD_REQUEST, "Invalid or expired OTP. Request a new code.");
    }

    if (userId && otpDoc.userId && otpDoc.userId !== userId) {
        throw new AppError(status.FORBIDDEN, "OTP does not match this account");
    }

    if (otpDoc.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
        throw new AppError(
            429,
            "Too many invalid attempts. Request a new OTP after 5 minutes."
        );
    }

    const isMatch = await bcrypt.compare(trimmedCode, otpDoc.codeHash);

    if (!isMatch) {
        otpDoc.attempts += 1;
        await otpDoc.save();

        if (otpDoc.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
            throw new AppError(
                429,
                "Too many invalid attempts. Request a new OTP after 5 minutes."
            );
        }

        throw new AppError(status.BAD_REQUEST, "Invalid OTP");
    }

    otpDoc.consumedAt = new Date();
    await otpDoc.save();

    return { verified: true, identifier: normalized, purpose };
};

export const otpService = {
    createAndSendOtp,
    verifyOtp,
};
