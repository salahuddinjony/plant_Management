import { Types } from "mongoose";

export type TOrder = {
    orderId: string;
    userId: Types.ObjectId | string;
    items: {
        productId: string;
        name: string;
        price: number;
        quantity: number;
        total: number;
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
    discountCode?: string;
    discountAmount?: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
};
