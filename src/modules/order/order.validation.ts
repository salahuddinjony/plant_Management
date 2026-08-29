import { z } from "zod";
import AppError from "../../errors/AppError";
import { ORDER_PAYMENT_STATUSES, ORDER_STATUSES } from "./order.constants";
import { isCodPayment } from "./order-payment.util";
import { parseOrderStatusQuery } from "./order-status.util";

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
        couponCode: z.string().trim().optional(),
        /** @deprecated Use couponCode. */
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
        couponCode: z.string().trim().optional(),
        /** @deprecated Use couponCode. */
        discountCode: z.string().optional(),
        notes: z.string().optional(),
    })
    .superRefine(orderPaymentRefinement);

export const buyNowOrderZodSchema = z.object({
    body: buyNowOrderBodySchema,
});

const selectedProductIdsField = z
    .array(z.string().regex(/^[0-9a-f]{24}$/i, "Invalid product ID"))
    .min(1, "At least one product must be selected")
    .refine((ids) => new Set(ids).size === ids.length, {
        message: "Duplicate product IDs are not allowed",
    });

const orderQuoteBodySchema = z.discriminatedUnion("mode", [
    z.object({
        mode: z.literal("cart"),
        selectedProductIds: selectedProductIdsField,
        couponCode: z.string().trim().optional(),
        /** @deprecated Use couponCode. */
        discountCode: z.string().optional(),
    }),
    z.object({
        mode: z.literal("buy_now"),
        productId: z.string().regex(/^[0-9a-f]{24}$/i, "Invalid product ID"),
        quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
        couponCode: z.string().trim().optional(),
        /** @deprecated Use couponCode. */
        discountCode: z.string().optional(),
    }),
]);

export const orderQuoteZodSchema = z.object({
    body: orderQuoteBodySchema,
});

const updateOrderStatusValidationSchema = z.object({
    body: z.object({
        status: z.enum(ORDER_STATUSES, {
            errorMap: () => ({ message: "Invalid order status" }),
        }),
    }),
});

const orderByPeriodQuerySchema = z.object({
    query: z
        .object({
            month: z.coerce
                .number({ required_error: "month is required", invalid_type_error: "month must be a number" })
                .int("month must be an integer")
                .min(1, "month must be between 1 and 12")
                .max(12, "month must be between 1 and 12"),
            year: z.coerce
                .number({ required_error: "year is required", invalid_type_error: "year must be a number" })
                .int("year must be an integer")
                .min(2000, "year must be between 2000 and 2100")
                .max(2100, "year must be between 2000 and 2100"),
            orderStatus: z.string().optional(),
            sort: z.string().optional(),
            fields: z.string().optional(),
        })
        .superRefine((data, ctx) => {
            try {
                parseOrderStatusQuery(data.orderStatus);
            } catch (error) {
                if (error instanceof AppError) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: error.message,
                        path: ["orderStatus"],
                    });
                }
            }
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
    orderQuoteZodSchema,
    updateOrderStatusValidationSchema,
    updateOrderPaymentStatusValidationSchema,
    orderByPeriodQuerySchema,
};
