export type TOrder = {
    orderId: string;
    userId: string;
    items: {
        productId: string;
        name: string;
        price: number;
        quantity: number;
        total: number;
    }[];
    shippingAddress: {
        street: string;
        city: string;
        postalCode?: string;
        country: string;
    };
    billingAddress?: {
        street: string;
        city: string;
        postalCode?: string;
        country: string;
    };
    orderStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
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
