/** All granular permissions for the admin panel */
export const PERMISSIONS = {
    ALL: "*",
    READ_ALL: "*:read",

    ORDERS_READ: "orders:read",
    ORDERS_WRITE: "orders:write",
    ORDERS_UPDATE_STATUS: "orders:update_status",
    ORDERS_UPDATE_PAYMENT: "orders:update_payment",

    PRODUCTS_WRITE: "products:write",
    CATEGORIES_WRITE: "categories:write",
    FLASH_SALES_WRITE: "flash_sales:write",
    CAROUSELS_WRITE: "carousels:write",
    CONTACTS_WRITE: "contacts:write",
    AVATARS_WRITE: "avatars:write",

    ORDER_SETTINGS_WRITE: "order_settings:write",
    PAYMENT_METHODS_WRITE: "payment_methods:write",

    TRANSACTIONS_READ: "transactions:read",
    TRANSACTIONS_WRITE: "transactions:write",

    COUPONS_WRITE: "coupons:write",
    USERS_READ: "users:read",
    REVIEWS_WRITE: "reviews:write",

    STAFF_INVITE: "staff:invite",
    STAFF_MANAGE: "staff:manage",
} as const;

export type TPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_VALUES: TPermission[] = Object.values(PERMISSIONS);
