import crypto from "crypto";

export const generateResetToken = (): string =>
    crypto.randomBytes(32).toString("hex");

export const hashResetToken = (token: string): string =>
    crypto.createHash("sha256").update(token.trim()).digest("hex");
