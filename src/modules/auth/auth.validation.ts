import { z } from "zod";
import { USER_ROLE } from "../../constants/status.constants";

export type TLogin = {
  emailOrPhone: string;
  password: string;
};

const emailOrPhoneSchema = z
  .string({
    required_error: "Email or phone is required",
    invalid_type_error: "Email or phone must be a string",
  })
  .trim()
  .refine(
    (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || /^\d{11}$/.test(val),
    { message: "Must be a valid email or 11-digit phone number" }
  );

const signUpZodSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: "Name is required",
        invalid_type_error: "Name must be a string",
      })
      .min(3, "Name must be at least 3 characters")
      .max(255),
    emailOrPhone: emailOrPhoneSchema,
    password: z
      .string({
        required_error: "Password is required",
        invalid_type_error: "Password must be a string",
      })
      .min(6, "Password must be at least 6 characters")
      .max(255)
      .trim(),
    profilePicture: z.string().optional(),
    role: z
      .enum(Object.values(USER_ROLE) as [string, ...string[]], {
        invalid_type_error: "Role must be a valid role",
      })
      .optional(),
  }),
});

const loginZodSchema = z.object({
  body: z.object({
    emailOrPhone: emailOrPhoneSchema,
    password: z.string().min(6, "Password must be at least 6 characters").trim(),
  }),
});

const otpCodeSchema = z
  .string({ required_error: "OTP is required" })
  .trim()
  .regex(/^\d{6}$/, "OTP must be 6 digits");

/** Standard + Flutter legacy (`email` instead of `emailOrPhone`) */
const verifySignupOtpZodSchema = z.object({
  body: z
    .object({
      emailOrPhone: emailOrPhoneSchema.optional(),
      email: z.string().trim().email("Invalid email").optional(),
      otp: otpCodeSchema,
    })
    .refine((data) => Boolean(data.emailOrPhone || data.email), {
      message: "emailOrPhone or email is required",
      path: ["emailOrPhone"],
    }),
});

const verifyEmailLegacyZodSchema = verifySignupOtpZodSchema;

const requestPasswordResetZodSchema = z.object({
  body: z
    .object({
      emailOrPhone: emailOrPhoneSchema.optional(),
      email: z.string().trim().email("Invalid email").optional(),
    })
    .refine((data) => Boolean(data.emailOrPhone || data.email), {
      message: "emailOrPhone or email is required",
      path: ["emailOrPhone"],
    }),
});

const resendOtpZodSchema = z.object({
  body: z
    .object({
      emailOrPhone: emailOrPhoneSchema.optional(),
      email: z.string().trim().email("Invalid email").optional(),
      purpose: z.enum(["signup", "forgot_password"], {
        errorMap: () => ({ message: "purpose must be signup or forgot_password" }),
      }),
    })
    .refine((data) => Boolean(data.emailOrPhone || data.email), {
      message: "emailOrPhone or email is required",
      path: ["emailOrPhone"],
    }),
});

const changePasswordZodSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, "Old password is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
  }),
});

const forgotPasswordBodySchema = z
  .object({
    emailOrPhone: emailOrPhoneSchema.optional(),
    email: z.string().trim().email("Invalid email").optional(),
  })
  .refine((data) => Boolean(data.emailOrPhone || data.email), {
    message: "emailOrPhone or email is required",
    path: ["emailOrPhone"],
  });

const forgotPasswordValidationSchema = z.object({
  body: forgotPasswordBodySchema,
});

const verifyResetOtpZodSchema = z.object({
  body: z
    .object({
      emailOrPhone: emailOrPhoneSchema.optional(),
      email: z.string().trim().email("Invalid email").optional(),
      otp: otpCodeSchema,
    })
    .refine((data) => Boolean(data.emailOrPhone || data.email), {
      message: "emailOrPhone or email is required",
      path: ["emailOrPhone"],
    }),
});

const resetPasswordValidationSchema = z.object({
  body: z
    .object({
      resetToken: z.string().min(1, "Reset token is required").optional(),
      reset_token: z.string().min(1, "Reset token is required").optional(),
      newPassword: z.string().min(6, "Password must be at least 6 characters").optional(),
      new_password: z.string().min(6, "Password must be at least 6 characters").optional(),
    })
    .refine((data) => Boolean(data.resetToken || data.reset_token), {
      message: "resetToken is required",
      path: ["resetToken"],
    })
    .refine((data) => Boolean(data.newPassword || data.new_password), {
      message: "newPassword is required",
      path: ["newPassword"],
    }),
});

export const AuthValidations = {
  signUpZodSchema,
  loginZodSchema,
  verifySignupOtpZodSchema,
  verifyEmailLegacyZodSchema,
  requestPasswordResetZodSchema,
  resendOtpZodSchema,
  changePasswordZodSchema,
  forgotPasswordValidationSchema,
  verifyResetOtpZodSchema,
  resetPasswordValidationSchema,
};
