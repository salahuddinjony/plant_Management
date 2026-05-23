import argon2 from "argon2";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import config from "../../config";

export type TPayload = {
  id: mongoose.ObjectId;
  emailOrPhone: string;
  role: string;
};

export const generateToken = async (
  payload: TPayload,
  isRefresh: boolean = false
) => {
  const numberOfDay = isRefresh
    ? parseFloat(config.jwtRefreshExpiresIn as string)
    : parseFloat(config.jwtAccessExpiresIn as string);

  return jwt.sign(payload, config.jwtAccessSecret as string, {
    expiresIn: `${numberOfDay}d`,
  });
};

export const isPasswordHashed = (value: string): boolean =>
  typeof value === "string" && value.startsWith("$argon2");

export const hashPassword = async (password: string): Promise<string> => {
  try {
    return await argon2.hash(password);
  } catch {
    throw new Error("Error hashing the password");
  }
};

/** Verify plain password against stored value (argon2 hash or legacy plain text). */
export const verifyUserPassword = async (
  plainTextPassword: string,
  storedPassword: string
): Promise<boolean> => {
  if (!storedPassword || !plainTextPassword) {
    return false;
  }

  if (isPasswordHashed(storedPassword)) {
    try {
      return await argon2.verify(storedPassword, plainTextPassword);
    } catch {
      return false;
    }
  }

  return storedPassword === plainTextPassword;
};

export const comparePasswords = async (
  hashedPassword: string,
  plainTextPassword: string
): Promise<boolean> => verifyUserPassword(plainTextPassword, hashedPassword);

export const verifyAccessToken = (token: string) => {
  const decoded = jwt.verify(token, config.jwtAccessSecret as string);
  return decoded;
};

export const verifyRefreshToken = (token: string) => {
  const decoded = jwt.verify(token, config.jwtRefreshSecret as string);
  return decoded;
};

// -------------------------- send verification email ------------------------------------
// Moved to /utils/emailService.ts
