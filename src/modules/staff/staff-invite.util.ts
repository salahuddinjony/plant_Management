import crypto from "crypto";
import { STAFF_INVITE_CODE_LENGTH } from "./staff-invite.constants";

const INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateInviteToken = (): string => crypto.randomBytes(32).toString("hex");

export const hashInviteSecret = (value: string): string =>
    crypto.createHash("sha256").update(value.trim()).digest("hex");

export const generateInviteCode = (): string => {
    let code = "";
    const bytes = crypto.randomBytes(STAFF_INVITE_CODE_LENGTH);
    for (let i = 0; i < STAFF_INVITE_CODE_LENGTH; i += 1) {
        code += INVITE_CODE_CHARS[bytes[i] % INVITE_CODE_CHARS.length];
    }
    return code;
};

export const buildInviteDeepLink = (baseUrl: string, token: string): string => {
    const trimmed = baseUrl.replace(/\/$/, "");
    return `${trimmed}?token=${encodeURIComponent(token)}`;
};
