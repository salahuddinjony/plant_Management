import AppError from "../../errors/AppError";
import { normalizeIdentifier } from "../../utils/identifierChannel.util";

/** Supports Flutter legacy `email` field and standard `emailOrPhone`. */
export const resolveEmailOrPhoneFromBody = (body: {
    emailOrPhone?: string;
    email?: string;
}): string => {
    const raw = body.emailOrPhone ?? body.email;
    if (!raw || typeof raw !== "string") {
        throw new AppError(400, "Email or phone is required");
    }
    return normalizeIdentifier(raw);
};

export const resolveResetPasswordBody = (body: {
    resetToken?: string;
    reset_token?: string;
    newPassword?: string;
    new_password?: string;
}): { resetToken: string; newPassword: string } => {
    const resetToken = body.resetToken ?? body.reset_token;
    const newPassword = body.newPassword ?? body.new_password;

    if (!resetToken) {
        throw new AppError(400, "Reset token is required");
    }
    if (!newPassword) {
        throw new AppError(400, "New password is required");
    }

    return { resetToken: resetToken.trim(), newPassword };
};
