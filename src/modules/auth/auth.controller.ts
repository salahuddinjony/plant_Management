import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../utils/catchAsync";
import { uploadImage } from "../../utils/imageUpload";
import sendResponse from "../../utils/sendResponse";
import {
  resolveEmailOrPhoneFromBody,
  resolveResetPasswordBody,
} from "./auth-body.util";
import { authServices } from "./auth.service";

const signUpController = catchAsync(async (req, res) => {
  const body = req.body;

  if (req.file) {
    const { url } = await uploadImage(req.file.buffer, "profile-pictures");
    body.profilePicture = url;
  }

  const result = await authServices.signUpService(body);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message:
      "OTP sent to your email or phone. Verify OTP to create your account.",
    data: result,
  });
});

const signInController = catchAsync(async (req, res) => {
  const result = await authServices.loginService(req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Signin completed successfully",
    data: result,
  });
});

const verifySignupOtpController = catchAsync(async (req, res) => {
  const emailOrPhone = resolveEmailOrPhoneFromBody(req.body);
  const { otp } = req.body;
  const result = await authServices.verifySignupOtpService(emailOrPhone, otp);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

const resendOtpController = catchAsync(async (req, res) => {
  const emailOrPhone = resolveEmailOrPhoneFromBody(req.body);
  const { purpose } = req.body;
  const result = await authServices.resendOtpService(emailOrPhone, purpose);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const verifyAccessTokenController = catchAsync(async (req, res) => {
  const { token } = req.body || "";
  const result = await authServices.verifyAccessTokenService(token);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Access token verified successfully",
    data: result,
  });
});

const changePasswordController = catchAsync(async (req, res) => {
  const { id } = req.user;
  const { oldPassword, newPassword } = req.body;

  const result = await authServices.changePasswordService(
    id,
    oldPassword,
    newPassword
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Password changed successfully",
    data: result,
  });
});

const forgotPasswordController = catchAsync(async (req: Request, res: Response) => {
  const emailOrPhone = resolveEmailOrPhoneFromBody(req.body);
  const result = await authServices.forgotPasswordService(emailOrPhone);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const verifyForgotPasswordOtpController = catchAsync(async (req, res) => {
  const emailOrPhone = resolveEmailOrPhoneFromBody(req.body);
  const { otp } = req.body;
  const result = await authServices.verifyForgotPasswordOtpService(
    emailOrPhone,
    otp
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: { resetToken: result.resetToken },
  });
});

const resetPasswordController = catchAsync(async (req: Request, res: Response) => {
  const { resetToken, newPassword } = resolveResetPasswordBody(req.body);
  const result = await authServices.resetPasswordService(resetToken, newPassword);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const authController = {
  signUpController,
  signInController,
  verifySignupOtpController,
  resendOtpController,
  verifyAccessTokenController,
  changePasswordController,
  forgotPasswordController,
  verifyForgotPasswordOtpController,
  resetPasswordController,
};
