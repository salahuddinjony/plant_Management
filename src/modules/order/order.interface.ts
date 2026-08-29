import { Types } from "mongoose";

export type TOrder = {
    orderId: string;
    userId: Types.ObjectId | string;
    items: {
        productId: string;
        name: string;
        /** Original unit price before the product discount. */
        originalPrice?: number;
        /** Discounted unit price charged to the customer. */
        price: number;
        quantity: number;
        total: number;
        /** Product discount for this line, including quantity. */
        productDiscountAmount?: number;
    }[];
    shippingAddress: {
        street?: string;
        city: string;
        postalCode?: string;
        country: string;
        phoneNumber: string;
        label: "home" | "office" | "other";
    };
    billingAddress?: {
        street?: string;
        city: string;
        postalCode?: string;
        country: string;
        phoneNumber?: string;
        label?: "home" | "office" | "other";
    };
    orderStatus: "pending" | "processing" | "delivered" | "cancelled";
    paymentStatus: "pending" | "completed" | "failed";
    paymentMethod?: string;
    transactionId?: string;
    subtotal: number;
    tax: number;
    shippingCost: number;
    total: number;
    /** Coupon code used for this order. */
    couponCode?: string;
    /** @deprecated Use couponCode. */
    discountCode?: string;
    /** Product markdown amount already reflected in subtotal. */
    productDiscountAmount?: number;
    /** Coupon discount amount deducted from the subtotal. */
    couponDiscountAmount?: number;
    /** Coupon discount amount kept for order-history compatibility. */
    discountAmount?: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
};
