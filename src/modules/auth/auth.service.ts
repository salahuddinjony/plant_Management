import status from "http-status";
import { JwtPayload } from "jsonwebtoken";
import { USER_ROLE, USER_STATUS } from "../../constants/status.constants";
import AppError from "../../errors/AppError";
import { TUser, TUserRole } from "../users/users.interface";
import { UserModel } from "../users/users.model";
import { TSignUp } from "./auth.interface";
import {
  generateToken,
  verifyAccessToken
} from "./auth.utils";
import { TLogin } from "./auth.validation";



// ------------- signup service -------------------
/**
 * Handles user signup by creating a new user.
 * @param {TSignUp} payload - The signup payload containing user details (name, emailOrPhone, password).
 * @returns {Promise<Partial<TUser>>} - The created user data.
 * @throws {AppError} - If user creation fails.
 */
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
      status: { $nin: [USER_STATUS.DELETED] },
    });
    if (activeAdminCount >= 1) {
      throw new AppError(
        status.CONFLICT,
        "An admin account already exists. Only one admin is allowed."
      );
    }
    resolvedRole = USER_ROLE.ADMIN;
  }

  // Check if user already exists
  const existingUser = await UserModel.findOne({ emailOrPhone: payload.emailOrPhone });

  if (existingUser) {
    throw new AppError(status.BAD_REQUEST, "User already exists");
  }

  try {
    const userData: Partial<TUser> = {
      name: payload.name,
      emailOrPhone: payload.emailOrPhone,
      password: payload.password,
      profilePicture: payload.profilePicture,
      role: resolvedRole,
    };

    // Create a new user
    const newUser = await UserModel.create(userData);

    if (!newUser) {
      throw new AppError(status.BAD_REQUEST, "Failed to create new user!");
    }

    return newUser.toObject({
      versionKey: false,
      transform: (doc, ret: any) => {
        delete ret.password;
        return ret;
      },
    });
  } catch (error: any) {
    throw new AppError(status.BAD_REQUEST, error.message || "Signup failed");
  }
};

// ------------- login service -------------------
/**
 * Handles user login by verifying credentials and generating access/refresh tokens.
 * @param {TLogin} payload - The login payload containing emailOrPhone and password.
 * @returns {Promise<Object>} - The user data with tokens.
 * @throws {AppError} - If credentials are invalid or user is blocked/deleted.
 */
const loginService = async (payload: TLogin) => {
  // Find user by emailOrPhone and include password for comparison
  const user = await UserModel.findOne({ emailOrPhone: payload.emailOrPhone }).select("+password");

  if (!user) {
    throw new AppError(status.NOT_FOUND, "This user is not found");
  }

  // Check is deleted softly
  if (user.isDeleted || user.status === USER_STATUS.DELETED) {
    throw new AppError(status.FORBIDDEN, "This user has been deleted");
  }

  // Check status
  if (user.status === USER_STATUS.BLOCKED) {
    throw new AppError(status.FORBIDDEN, "This user is blocked");
  }

  // Check if password matched
  if (payload.password != user.password) {
    throw new AppError(status.FORBIDDEN, "Your password is incorrect");
  }

  const jwtPayload = { id: (user as any)._id, emailOrPhone: user.emailOrPhone, role: user.role as string };
  // Generate tokens
  const jwtAccessToken = await generateToken(jwtPayload);
  const jwtRefreshToken = await generateToken(jwtPayload, true);

  // Update user with tokens
  const updatedUser = await UserModel.findByIdAndUpdate(
    (user as any)._id,
    {
      accessToken: jwtAccessToken,
      refreshToken: jwtRefreshToken,
    },
    { new: true }
  );

  return {
    user: updatedUser,
    accessToken: jwtAccessToken,
    refreshToken: jwtRefreshToken,
  };
};

/**
 * Resend OTP for unverified email
 * @param email 
 * @returns 
 */
// ============================================================================
// COMMENTED OUT: Old resendOtp implementation - replaced with resendOtpService below
// ============================================================================
// const resendOtpService = async (email: string) => {
//   const user = await UserModel.findOne({ email });

//   if (!user) {
//     throw new AppError(status.NOT_FOUND, "This user is not found");
//   }

//   if (user.isEmailVerified) {
//     throw new AppError(status.FORBIDDEN, "Your email is already verified");
//   }

//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

//   // send OTP to user
//   const verificationLink = `${config.clientUrl}/auth/verify-email?token=${otp}&email=${email}`;
//   await sendEmail({
//     email,
//     token: otp,
//     username: user.name,
//     verificationLink,
//   });

//   const updatedUser = await UserModel.findByIdAndUpdate(
//     (user as any)._id,
//     {
//       emailVerificationToken: otp,
//       emailVerificationTokenExpires: otpExpires,
//     },
//     { new: true }
//   );

//   return updatedUser;
// };

// ------------- logout service -------------------
// const signOutService = async (userId: string, token: string) => {
//   const decoded = verifyAccessToken(token) as JwtPayload;

//   if (decoded.id !== userId) {
//     throw new AppError(status.UNAUTHORIZED, "Unauthorized");
//   }

//   const updatedUser = await UserModel.findByIdAndUpdate(
//     userId,
//     {
//       accessToken: "",
//       refreshToken: "",
//     },
//     { new: true }
//   );

//   return updatedUser;
// };

// ------------- refresh token service -------------------
// const refreshTokenService = async (id: string, token: string) => {
//   const user = await UserModel.findById(id);

//   if (!user || !user.refreshToken || user.refreshToken !== token) {
//     throw new AppError(status.UNAUTHORIZED, "Refresh Token not found in database");
//   }

//   const decoded = verifyRefreshToken(token) as JwtPayload;
//   if (!decoded) {
//     throw new AppError(status.UNAUTHORIZED, "Invalid Refresh Token");
//   }

//   const accessToken = await generateToken(
//     { id: (user as any)._id, email: user.email, role: user.role as string },
//     false
//   );

//   const updatedUser = await UserModel.findByIdAndUpdate(
//     (user as any)._id,
//     { accessToken: accessToken },
//     { new: true }
//   );

//   return updatedUser;
// };

// ------------- verify email service -------------------
// COMMENTED OUT: Email verification is no longer required
// const verifyEmailService = async (
//   email: string,
//   providedOtp: string,
//   isLink: boolean = false
// ) => {
//   const trimmedOtp = providedOtp.trim();
//   const user = await UserModel.findOne({ email });

//   if (!user) {
//     throw new AppError(status.NOT_FOUND, "User not found");
//   }

//   if (user.isEmailVerified) {
//     throw new AppError(status.BAD_REQUEST, "Email already verified");
//   }

//   if (!user.emailVerificationOtp) {
//     throw new AppError(status.BAD_REQUEST, "No verification OTP found");
//   }

//   const isTokenValid = user.emailVerificationOtp === trimmedOtp;
//   const isTokenNotExpired =
//     user.emailVerificationOtpExpires &&
//     user.emailVerificationOtpExpires > new Date();

//   if (!isTokenValid) {
//     throw new AppError(status.UNAUTHORIZED, "Invalid verification code");
//   }

//   if (!isTokenNotExpired) {
//     throw new AppError(status.UNAUTHORIZED, "Verification code has expired");
//   }

//   user.isEmailVerified = true;
//   user.emailVerificationOtp = undefined;
//   user.emailVerificationOtpExpires = undefined;

//   if (isLink) {
//     const jwtPayload = { id: (user as any)._id, email: user.email, role: user.role as string };
//     const accessToken = await generateToken(jwtPayload);
//     const refreshToken = await generateToken(jwtPayload, true);

//     user.accessToken = accessToken;
//     user.refreshToken = refreshToken;
//   }

//   await user.save();

//   return {
//     message: "✅ Email verified successfully",
//     accessToken: user.accessToken,
//     refreshToken: user.refreshToken,
//   };
// };

/**
 * Resend OTP for unverified email
 * COMMENTED OUT: Email verification is no longer required
 * @param email 
 * @returns 
 */
// const resendOtpService = async (email: string) => {
//   const user = await UserModel.findOne({ email });

//   if (!user) {
//     throw new AppError(status.NOT_FOUND, "User not found");
//   }

//   if (user.isEmailVerified) {
//     throw new AppError(status.BAD_REQUEST, "Email already verified");
//   }

//   const otpToken = Math.floor(100000 + Math.random() * 900000).toString();
//   const otpExpiration = new Date(Date.now() + 5 * 60 * 1000);

//   user.emailVerificationOtp = otpToken;
//   user.emailVerificationOtpExpires = otpExpiration;
//   await user.save();

//   const verificationLink = `${config.clientUrl}/auth/verify-email?token=${otpToken}&email=${email}`;
//   await sendEmail({
//     email,
//     token: otpToken,
//     username: user.name,
//     verificationLink,
//   });

//   return {
//     message: "Verification email sent successfully",
//     email: user.email,
//   };
// };

// ============================================================================
// COMMENTED OUT: Alternative forgot password implementation using OTP
// This was replaced with token-based reset (requestPasswordResetService)
// ============================================================================
// /**
//  * Send OTP if forgot password.
//  * @param email 
//  * @returns 
//  */
// const forgotPasswordService = async (email: string) => {
//   const user = await UserModel.findOne({ email });

//   if (!user) {
//     throw new AppError(status.NOT_FOUND, "User not found");
//   }
//   if (user.isDeleted || user.status === USER_STATUS.DELETED) {
//     throw new AppError(status.FORBIDDEN, "This user has been deleted");
//   }
//   const otpToken = Math.floor(100000 + Math.random() * 900000).toString();
//   const otpExpiration = new Date(Date.now() + 5 * 60 * 1000);

//   await UserModel.findByIdAndUpdate(
//     (user as any)._id,
//     {
//       passwordResetOtp: otpToken,
//       passwordResetOtpExpires: otpExpiration,
//     },
//     { new: true }
//   );

//   const resetLink = `${config.clientUrl}/auth/reset-password?token=${otpToken}&email=${email}`;
//   await sendEmail({
//     email,
//     token: otpToken,
//     username: user.name,
//     verificationLink: resetLink,
//   });

//   return {
//     message: "If an account exists with this email, a reset link has been sent",
//   };
// };


// ------------------ verify JWT ----------------------------
const verifyAccessTokenService = (token: string) => {
  try {
    const decoded = verifyAccessToken(token) as JwtPayload;
    if (!decoded) {
      throw new AppError(status.UNAUTHORIZED, "Invalid access token");
    }
    return decoded;
  } catch (error: any) {
    throw new AppError(status.UNAUTHORIZED, error.message);
  }
};

// ------------- change password service -------------------
const changePasswordService = async (
  userId: string,
  oldPass: string,
  newPass: string
) => {
  const user = await UserModel.findById(userId).select("+password");

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  // if (!(await comparePasswords(user.password, oldPass))) {
  //   throw new AppError(status.FORBIDDEN, "Incorrect old password");
  // }

  if (oldPass !== user.password) {
    throw new AppError(status.FORBIDDEN, "Incorrect old password");
  }

  // user.password = await hashPassword(newPass);
  user.password = newPass;
  user.passwordChangedAt = new Date();
  await user.save();

  return { message: "Password changed successfully" };
};

// ------------- Forgot password service ----------------------------
/**
 * Check if user exists by emailOrPhone
 * @param emailOrPhone - Email or phone number
 * @returns User data if exists
 */
const forgotPasswordService = async (emailOrPhone: string) => {
  const user = await UserModel.findOne({ emailOrPhone });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found with this email or phone");
  }

  // Check if user is deleted or blocked
  if (user.isDeleted || user.status === USER_STATUS.DELETED) {
    throw new AppError(status.FORBIDDEN, "This user has been deleted");
  }

  if (user.status === USER_STATUS.BLOCKED) {
    throw new AppError(status.FORBIDDEN, "This user is blocked");
  }

  // Return user data without sensitive information
  return user.toObject({
    versionKey: false,
    transform: (doc, ret: any) => {
      delete ret.password;
      delete ret.accessToken;
      delete ret.refreshToken;
      return ret;
    },
  });
};

// ------------- Reset password service ----------------------------
/**
 * Reset user password using userId
 * @param userId - User ID
 * @param newPassword - New password
 * @returns Success message
 */
const resetPasswordService = async (
  userId: string,
  newPassword: string
) => {
  const user = await UserModel.findById(userId);

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  // Check if user is deleted or blocked
  if (user.isDeleted || user.status === USER_STATUS.DELETED) {
    throw new AppError(status.FORBIDDEN, "This user has been deleted");
  }

  if (user.status === USER_STATUS.BLOCKED) {
    throw new AppError(status.FORBIDDEN, "This user is blocked");
  }

  // Update password
  user.password = newPassword;
  user.passwordChangedAt = new Date();
  await user.save();

  return { message: "Password reset successfully" };
};

export const authServices = {
  signUpService,
  loginService,
  // COMMENTED OUT: Email verification services no longer used
  // verifyEmailService,
  // resendOtpService,
  verifyAccessTokenService,
  changePasswordService,
  forgotPasswordService,
  resetPasswordService,
};
