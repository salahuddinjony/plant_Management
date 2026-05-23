import { z } from "zod";
import { ORDER_PAYMENT_STATUSES } from "./order.constants";
import { isCodPayment } from "./order-payment.util";

const paymentMethodField = z
    .string({ required_error: "Payment method is required" })
    .trim()
    .min(1, "Payment method is required");

const transactionIdField = z.string().trim().optional();

const orderPaymentRefinement = (
    data: { paymentMethod: string; transactionId?: string },
    ctx: z.RefinementCtx
) => {
    if (isCodPayment(data.paymentMethod)) {
        if (data.transactionId?.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Transaction ID is not used for COD orders",
                path: ["transactionId"],
            });
        }
        return;
    }

    if (!data.transactionId?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Transaction ID is required for online payment",
            path: ["transactionId"],
        });
    }
};

const orderBodySchema = z
    .object({
        shippingAddressId: z.string().regex(/^[0-9a-f]{24}$/i, "Invalid address ID"),
        billingAddressId: z.string().regex(/^[0-9a-f]{24}$/i, "Invalid address ID").optional(),
        selectedProductIds: z
            .array(z.string().regex(/^[0-9a-f]{24}$/i, "Invalid product ID"))
            .min(1, "At least one product must be selected"),
        paymentMethod: paymentMethodField,
        transactionId: transactionIdField,
        discountCode: z.string().optional(),
        notes: z.string().optional(),
    })
    .superRefine(orderPaymentRefinement);

export const createOrderZodSchema = z.object({
    body: orderBodySchema,
});

const buyNowOrderBodySchema = z
    .object({
        productId: z.string().regex(/^[0-9a-f]{24}$/i, "Invalid product ID"),
        quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
        shippingAddressId: z.string().regex(/^[0-9a-f]{24}$/i, "Invalid address ID"),
        paymentMethod: paymentMethodField,
        transactionId: transactionIdField,
        discountCode: z.string().optional(),
        notes: z.string().optional(),
    })
    .superRefine(orderPaymentRefinement);

export const buyNowOrderZodSchema = z.object({
    body: buyNowOrderBodySchema,
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
    buyNowOrderZodSchema,
    updateOrderStatusValidationSchema,
    updateOrderPaymentStatusValidationSchema,
};
