export const PAYMENT_ACCOUNT_TYPES = ["Personal", "Agent", "Bank"] as const;

export type TPaymentAccountType = (typeof PAYMENT_ACCOUNT_TYPES)[number];
