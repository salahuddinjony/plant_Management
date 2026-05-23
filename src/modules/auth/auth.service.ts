import status from "http-status";
import { JwtPayload } from "jsonwebtoken";
import { USER_ROLE, USER_STATUS } from "../../constants/status.constants";
import AppError from "../../errors/AppError";
import { normalizeIdentifier } from "../../utils/identifierChannel.util";
import { OtpModel } from "../otp/otp.model";
import { createAndSendOtp, verifyOtp } from "../otp/otp.service";
import { TOtpPurpose } from "../otp/otp.constants";
import { TUserRole } from "../users/users.interface";
import { UserModel } from "../users/users.model";
import { TSignUp } from "./auth.interface";
import {
    PENDING_SIGNUP_TTL_MS,
    PendingSignupModel,
} from "./pending-signup.model";
import {
    generateToken,
    hashPassword,
    isPasswordHashed,
    TPayload,
    verifyAccessToken,
    verifyUserPassword,
} from "./auth.utils";
import {
    createPasswordResetSession,
    consumePasswordResetSession,
} from "./password-reset-session.service";
import { TLogin } from "./auth.validation";

const FORGOT_PASSWORD_GENERIC_MESSAGE =
    "If an account exists with this email or phone, an OTP has been sent.";

const sanitizeUser = (user: { toObject: (opts?: object) => Record<string, unknown> }) =>
    user.toObject({
        versionKey: false,
        transform: (_doc: unknown, ret: Record<string, unknown>) => {
            delete ret.password;
            delete ret.accessToken;
            delete ret.refreshToken;
            return ret;
        },
    });

const issueTokensForUser = async (user: {
    _id: unknown;
    emailOrPhone: string;
    role?: string;
}) => {
    const jwtPayload: TPayload = {
        id: user._id as TPayload["id"],
        emailOrPhone: user.emailOrPhone,
        role: user.role as string,
    };
    const jwtAccessToken = await generateToken(jwtPayload);
    const jwtRefreshToken = await generateToken(jwtPayload, true);

    const updatedUser = await UserModel.findByIdAndUpdate(
        user._id,
        { accessToken: jwtAccessToken, refreshToken: jwtRefreshToken },
        { new: true }
    );

    return {
        user: updatedUser,
        accessToken: jwtAccessToken,
        refreshToken: jwtRefreshToken,
    };
};

const signUpService = async (payload: TSignUp) => {
    const requestedRole = (payload as TSignUp & { role?: string }).role;

    if (requestedRole === USER_ROLE.SUPER_ADMIN) {
        throw new AppError(
            status.FORBIDDEN,
            "Super Admin cannot be created via signup. Only the seeded super admin is allowed."
        );
    }

    let resolvedRole: TUserRole = USER_ROLE.USER;
    if (requestedRole === USER_ROLE.ADMIN) {
        const activeAdminCount = await UserModel.countDocuments({
            role: USER_ROLE.ADMIN,
            isDeleted: { $ne: true },
            status: { $nin: [USER_STATUS.DELETED, USER_STATUS.INACTIVE] },
        });
        if (activeAdminCount >= 1) {
            throw new AppError(
                status.CONFLICT,
                "An admin account already exists. Only one admin is allowed."
            );
        }
        resolvedRole = USER_ROLE.ADMIN;
    }

    const emailOrPhone = normalizeIdentifier(payload.emailOrPhone);
    const existingUser = await UserModel.findOne({ emailOrPhone });

    if (existingUser) {
        throw new AppError(status.BAD_REQUEST, "User already exists");
    }

    const expiresAt = new Date(Date.now() + PENDING_SIGNUP_TTL_MS);
    const hashedPassword = await hashPassword(payload.password);

    try {
        await PendingSignupModel.findOneAndUpdate(
            { emailOrPhone },
            {
                name: payload.name,
                emailOrPhone,
                password: hashedPassword,
                profilePicture: payload.profilePicture,
                role: resolvedRole,
                expiresAt,
            },
            { upsert: true, new: true }
        );

        const otpResult = await createAndSendOtp({
            identifier: emailOrPhone,
            purpose: "signup",
            userName: payload.name,
        });

        return {
            emailOrPhone,
            ...otpResult,
            message:
                "OTP sent. Verify to complete registration. User is created only after successful OTP verification.",
        };
    } catch (error) {
        await PendingSignupModel.deleteOne({ emailOrPhone });
        await OtpModel.updateMany(
            { identifier: emailOrPhone, purpose: "signup", consumedAt: null },
            { $set: { consumedAt: new Date() } }
        );
        throw error;
    }
};

const verifySignupOtpService = async (emailOrPhone: string, otp: string) => {
    const normalized = normalizeIdentifier(emailOrPhone);
    await verifyOtp({ identifier: normalized, purpose: "signup", code: otp });

    const pending = await PendingSignupModel.findOne({ emailOrPhone: normalized }).select(
        "+password"
    );

    if (!pending) {
        throw new AppError(
            status.BAD_REQUEST,
            "No pending registration found. Please sign up again."
        );
    }

    if (pending.expiresAt <= new Date()) {
        await PendingSignupModel.deleteOne({ emailOrPhone: normalized });
        throw new AppError(
            status.BAD_REQUEST,
            "Registration session expired. Please sign up again."
        );
    }

    const existingUser = await UserModel.findOne({ emailOrPhone: normalized });
    if (existingUser) {
        await PendingSignupModel.deleteOne({ emailOrPhone: normalized });
        throw new AppError(status.BAD_REQUEST, "User already exists");
    }

    const newUser = await UserModel.create({
        name: pending.name,
        emailOrPhone: normalized,
        password: pending.password,
        profilePicture: pending.profilePicture,
        role: pending.role,
        status: USER_STATUS.ACTIVE,
    });

    await PendingSignupModel.deleteOne({ emailOrPhone: normalized });

    const tokens = await issueTokensForUser(newUser);
    return {
        message: "Account created and verified successfully",
        ...tokens,
        user: sanitizeUser(newUser),
    };
};

const resendOtpService = async (emailOrPhone: string, purpose: TOtpPurpose) => {
    const normalized = normalizeIdentifier(emailOrPhone);

    if (purpose === "signup") {
        if (await UserModel.exists({ emailOrPhone: normalized })) {
            return {
                message: "If a pending registration exists, an OTP has been sent.",
            };
        }

        const pending = await PendingSignupModel.findOne({ emailOrPhone: normalized });
        if (!pending) {
            throw new AppError(
                status.BAD_REQUEST,
                "No pending registration. Please complete sign-up first."
            );
        }

        return createAndSendOtp({
            identifier: normalized,
            purpose: "signup",
            userName: pending.name,
        });
    }

    if (purpose === "forgot_password") {
        const user = await UserModel.findOne({ emailOrPhone: normalized });
        if (!user || user.isDeleted || user.status === USER_STATUS.DELETED) {
            return { message: FORGOT_PASSWORD_GENERIC_MESSAGE };
        }
        if (user.status === USER_STATUS.BLOCKED) {
            return { message: FORGOT_PASSWORD_GENERIC_MESSAGE };
        }
        await createAndSendOtp({
            identifier: normalized,
            purpose: "forgot_password",
            userId: String(user._id),
            userName: user.name,
        });
        return { message: FORGOT_PASSWORD_GENERIC_MESSAGE };
    }

    throw new AppError(
        status.BAD_REQUEST,
        "Invalid purpose. Use signup or forgot_password."
    );
};

const loginService = async (payload: TLogin) => {
    const emailOrPhone = normalizeIdentifier(payload.emailOrPhone);
    const user = await UserModel.findOne({ emailOrPhone }).select("+password");

    if (!user) {
        throw new AppError(status.NOT_FOUND, "This user is not found");
    }

    if (user.isDeleted || user.status === USER_STATUS.DELETED) {
        throw new AppError(status.FORBIDDEN, "This user has been deleted");
    }

    if (user.status === USER_STATUS.BLOCKED) {
        throw new AppError(status.FORBIDDEN, "This user is blocked");
    }

    if (user.status === USER_STATUS.INACTIVE) {
        throw new AppError(
            status.FORBIDDEN,
            "Account not verified. Complete OTP verification or resend signup OTP."
        );
    }

    const passwordMatches = await verifyUserPassword(payload.password, user.password);
    if (!passwordMatches) {
        throw new AppError(status.FORBIDDEN, "Your password is incorrect");
    }

    if (!isPasswordHashed(user.password)) {
        user.password = await hashPassword(payload.password);
        await user.save();
    }

    return issueTokensForUser(user);
};

const verifyAccessTokenService = (token: string) => {
    try {
        const decoded = verifyAccessToken(token) as JwtPayload;
        if (!decoded) {
            throw new AppError(status.UNAUTHORIZED, "Invalid access token");
        }
        return decoded;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Invalid token";
        throw new AppError(status.UNAUTHORIZED, message);
    }
};

const changePasswordService = async (
    userId: string,
    oldPass: string,
    newPass: string
) => {
    const user = await UserModel.findById(userId).select("+password");

    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    const oldPasswordMatches = await verifyUserPassword(oldPass, user.password);
    if (!oldPasswordMatches) {
        throw new AppError(status.FORBIDDEN, "Incorrect old password");
    }

    user.password = newPass;
    user.passwordChangedAt = new Date();
    user.accessToken = undefined;
    user.refreshToken = undefined;
    await user.save();

    return { message: "Password changed successfully" };
};

const forgotPasswordService = async (emailOrPhone: string) => {
    const normalized = normalizeIdentifier(emailOrPhone);
    const user = await UserModel.findOne({ emailOrPhone: normalized });

    if (
        user &&
        !user.isDeleted &&
        user.status !== USER_STATUS.DELETED &&
        user.status !== USER_STATUS.BLOCKED
    ) {
        await createAndSendOtp({
            identifier: normalized,
            purpose: "forgot_password",
            userId: String(user._id),
            userName: user.name,
        });
    }

    return { message: FORGOT_PASSWORD_GENERIC_MESSAGE };
};

const verifyForgotPasswordOtpService = async (emailOrPhone: string, otp: string) => {
    const normalized = normalizeIdentifier(emailOrPhone);
    await verifyOtp({ identifier: normalized, purpose: "forgot_password", code: otp });

    const user = await UserModel.findOne({ emailOrPhone: normalized });

    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (user.isDeleted || user.status === USER_STATUS.DELETED) {
        throw new AppError(status.FORBIDDEN, "This user has been deleted");
    }

    if (user.status === USER_STATUS.BLOCKED) {
        throw new AppError(status.FORBIDDEN, "This user is blocked");
    }

    const { resetToken } = await createPasswordResetSession(String(user._id));

    return {
        message: "OTP verified. Use resetToken to set a new password.",
        resetToken,
    };
};

const resetPasswordService = async (resetToken: string, newPassword: string) => {
    const { user } = await consumePasswordResetSession(resetToken);

    if (user.isDeleted || user.status === USER_STATUS.DELETED) {
        throw new AppError(status.FORBIDDEN, "This user has been deleted");
    }

    if (user.status === USER_STATUS.BLOCKED) {
        throw new AppError(status.FORBIDDEN, "This user is blocked");
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    user.accessToken = undefined;
    user.refreshToken = undefined;
    await user.save();

    return { message: "Password reset successful" };
};

export const authServices = {
    signUpService,
    verifySignupOtpService,
    resendOtpService,
    loginService,
    verifyAccessTokenService,
    changePasswordService,
    forgotPasswordService,
    verifyForgotPasswordOtpService,
    resetPasswordService,
};
