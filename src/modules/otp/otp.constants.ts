export const OTP_PURPOSES = ["signup", "forgot_password"] as const;
export type TOtpPurpose = (typeof OTP_PURPOSES)[number];

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MS = 5 * 60 * 1000;
export const OTP_RATE_WINDOW_MS = 5 * 60 * 1000;
export const OTP_MAX_SENDS_PER_WINDOW = 3;
export const OTP_MAX_VERIFY_ATTEMPTS = 3;
