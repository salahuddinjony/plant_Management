import { PopulateOptions } from "mongoose";

export const ORDER_PAYMENT_STATUSES = ["pending", "completed", "failed"] as const;
export type TOrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

/** Default payment status for new orders (manual verification by admin) */
export const ORDER_INITIAL_PAYMENT_STATUS: TOrderPaymentStatus = "pending";

export const ORDER_STATUSES = ["pending", "processing", "delivered", "cancelled"] as const;
export type TOrderStatus = (typeof ORDER_STATUSES)[number];

/** Populate customer on admin order lists / detail (matches transaction history). */
export const ORDER_USER_POPULATE: PopulateOptions = {
    path: "userId",
    select: "name emailOrPhone profilePicture avatarId role status",
    populate: { path: "avatarId", select: "name imageUrl" },
};

/** Populate product on each order line item (admin lists; no isAvailable filter). */
export const ORDER_ITEMS_PRODUCT_POPULATE: PopulateOptions = {
    path: "items.productId",
    select: "images",
};

export const ORDER_ADMIN_POPULATES: PopulateOptions[] = [ORDER_USER_POPULATE, ORDER_ITEMS_PRODUCT_POPULATE];

export const ORDER_STATUS_ALIASES: Record<string, TOrderStatus> = {
    pending: "pending",
    processing: "processing",
    delivered: "delivered",
    delivery: "delivered",
    cancelled: "cancelled",
    cancel: "cancelled",
    canceled: "cancelled",
};
