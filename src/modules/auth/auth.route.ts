import { Router } from "express";
import { USER_ROLE } from "../../constants/status.constants";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { upload } from "../../utils/multer";
import { authController } from "./auth.controller";
import { AuthValidations } from "./auth.validation";

const router = Router();

router.post(
  "/sign-up",
  upload.single("profilePicture"),
  validateRequest(AuthValidations.signUpZodSchema),
  authController.signUpController
);

router.post(
  "/verify-signup-otp",
  validateRequest(AuthValidations.verifySignupOtpZodSchema),
  authController.verifySignupOtpController
);

/** Flutter app alias */
router.post(
  "/verify-email",
  validateRequest(AuthValidations.verifyEmailLegacyZodSchema),
  authController.verifySignupOtpController
);

router.post(
  "/resend-otp",
  validateRequest(AuthValidations.resendOtpZodSchema),
  authController.resendOtpController
);

router.post(
  "/login",
  validateRequest(AuthValidations.loginZodSchema),
  authController.signInController
);

router.post(
  "/change-password",
  auth(USER_ROLE.ADMIN, USER_ROLE.USER, USER_ROLE.SUPER_ADMIN),
  validateRequest(AuthValidations.changePasswordZodSchema),
  authController.changePasswordController
);

router.post(
  "/forgot-password",
  validateRequest(AuthValidations.forgotPasswordValidationSchema),
  authController.forgotPasswordController
);

/** Flutter app alias */
router.post(
  "/request-password-reset",
  validateRequest(AuthValidations.requestPasswordResetZodSchema),
  authController.forgotPasswordController
);

/** Step 2: verify forgot-password OTP → returns resetToken */
router.post(
  "/verify-otp",
  validateRequest(AuthValidations.verifyResetOtpZodSchema),
  authController.verifyForgotPasswordOtpController
);

router.post(
  "/reset-password",
  validateRequest(AuthValidations.resetPasswordValidationSchema),
  authController.resetPasswordController
);

export const authRoute = router;
