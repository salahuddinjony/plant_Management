export const ORDER_PAYMENT_STATUSES = ["pending", "completed", "failed"] as const;
export type TOrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

/** Default payment status for new orders (manual verification by admin) */
export const ORDER_INITIAL_PAYMENT_STATUS: TOrderPaymentStatus = "pending";
