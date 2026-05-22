import { z } from "zod";
import { ORDER_PAYMENT_STATUSES } from "./order.constants";

const orderBodySchema = z.object({
    shippingAddressId: z.string().regex(/^[0-9a-f]{24}$/i, "Invalid address ID"),
    billingAddressId: z.string().regex(/^[0-9a-f]{24}$/i, "Invalid address ID").optional(),
    selectedProductIds: z.array(z.string().regex(/^[0-9a-f]{24}$/i, "Invalid product ID")).min(1, "At least one product must be selected"),
    paymentMethod: z.string().optional(),
    transactionId: z.string().optional(),
    discountCode: z.string().optional(),
    notes: z.string().optional(),
}).refine(
    (data) => {
        // If payment method is not cash on delivery, transaction ID is required
        const cashOnDeliveryVariants = ["cash", "cod", "cash on delivery", "cash_on_delivery"];
        const isCashOnDelivery = !data.paymentMethod || cashOnDeliveryVariants.includes(data.paymentMethod.toLowerCase());

        if (!isCashOnDelivery && !data.transactionId) {
            return false;
        }
        return true;
    },
    {
        message: "Transaction ID is required for non-cash on delivery payments",
        path: ["transactionId"],
    }
);

export const createOrderZodSchema = z.object({
    body: orderBodySchema,
});

const updateOrderStatusValidationSchema = z.object({
    body: z.object({
        status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"], {
            errorMap: () => ({ message: "Invalid order status" }),
        }),
    }),
});

const updateOrderPaymentStatusValidationSchema = z.object({
    body: z.object({
        paymentStatus: z.enum(ORDER_PAYMENT_STATUSES, {
            errorMap: () => ({
                message: "paymentStatus must be pending, completed, or failed",
            }),
        }),
    }),
});

export const orderValidation = {
    createOrderZodSchema,
    updateOrderStatusValidationSchema,
    updateOrderPaymentStatusValidationSchema,
};
