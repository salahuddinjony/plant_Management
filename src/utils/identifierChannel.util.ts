import AppError from "../errors/AppError";
import { TOtpChannel } from "../modules/otp/otp.interface";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{11}$/;

export const normalizeIdentifier = (value: string): string => value.trim();

export const getIdentifierChannel = (value: string): TOtpChannel => {
    const normalized = normalizeIdentifier(value);
    if (EMAIL_REGEX.test(normalized)) {
        return "email";
    }
    if (PHONE_REGEX.test(normalized)) {
        return "sms";
    }
    throw new AppError(400, "Must be a valid email or 11-digit phone number");
};

export const isValidEmailOrPhone = (value: string): boolean => {
    const normalized = normalizeIdentifier(value);
    return EMAIL_REGEX.test(normalized) || PHONE_REGEX.test(normalized);
};

/** BD 11-digit (01...) → MIM format 8801... */
export const toMimMobileNumber = (phone11: string): string => {
    const normalized = normalizeIdentifier(phone11);
    if (!PHONE_REGEX.test(normalized)) {
        throw new AppError(400, "Invalid phone number");
    }
    if (normalized.startsWith("0")) {
        return `880${normalized.slice(1)}`;
    }
    if (normalized.startsWith("880")) {
        return normalized;
    }
    return `880${normalized}`;
};
