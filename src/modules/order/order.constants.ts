export const ORDER_PAYMENT_STATUSES = ["pending", "completed", "failed"] as const;
export type TOrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];
