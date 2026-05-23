import status from "http-status";
import AppError from "../../errors/AppError";
import { UserModel } from "../users/users.model";
import { RESET_SESSION_EXPIRY_MS } from "./password-reset-session.constants";
import { PasswordResetSessionModel } from "./password-reset-session.model";
import {
    generateResetToken,
    hashResetToken,
} from "./password-reset-session.util";

const invalidateActiveSessions = async (userId: string) => {
    await PasswordResetSessionModel.updateMany(
        { userId, isUsed: false },
        { $set: { isUsed: true } }
    );
};

export const createPasswordResetSession = async (userId: string) => {
    await invalidateActiveSessions(userId);

    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + RESET_SESSION_EXPIRY_MS);

    await PasswordResetSessionModel.create({
        userId,
        resetTokenHash: hashResetToken(resetToken),
        expiresAt,
        isUsed: false,
    });

    return { resetToken, expiresAt };
};

export const consumePasswordResetSession = async (resetToken: string) => {
    const tokenHash = hashResetToken(resetToken);

    const session = await PasswordResetSessionModel.findOne({
        resetTokenHash: tokenHash,
        isUsed: false,
        expiresAt: { $gt: new Date() },
    }).select("+resetTokenHash");

    if (!session) {
        throw new AppError(
            status.BAD_REQUEST,
            "Invalid or expired reset token. Verify OTP again."
        );
    }

    const user = await UserModel.findById(session.userId);
    if (!user) {
        session.isUsed = true;
        await session.save();
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    session.isUsed = true;
    await session.save();

    return { user, session };
};
