import { z } from "zod";
import { PAYMENT_ACCOUNT_TYPES } from "./payment-method.constants";

const requiredString = (label: string) =>
    z
        .string({
            required_error: `${label} is required`,
            invalid_type_error: `${label} must be a string`,
        })
        .min(1, `${label} is required`)
        .trim();

const requireBranchNameForBank = (
    data: { accountType?: string; branchName?: string },
    ctx: z.RefinementCtx
) => {
    if (data.accountType === "Bank" && !data.branchName?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Branch name is required when account type is Bank",
            path: ["branchName"],
        });
    }
};

const paymentMethodFieldsSchema = z.object({
    methodName: requiredString("Method name"),
    accountNumber: requiredString("Account number"),
    accountName: requiredString("Account name"),
    accountType: z.enum(PAYMENT_ACCOUNT_TYPES, {
        errorMap: () => ({
            message: `Invalid account type. Allowed: ${PAYMENT_ACCOUNT_TYPES.join(", ")}`,
        }),
    }),
    branchName: z.string().trim().optional(),
    description: z.string().trim().optional(),
    instructions: z.string().trim().optional(),
    isActive: z.boolean().optional(),
    displayOrder: z.number().optional(),
});

const paymentMethodBodySchema = paymentMethodFieldsSchema.superRefine(requireBranchNameForBank);

const paymentMethodZodSchema = z.object({
    body: paymentMethodBodySchema,
});

const updatePaymentMethodZodSchema = z.object({
    body: paymentMethodFieldsSchema.partial(),
    params: z.object({
        id: z.string().regex(/^[0-9a-f]{24}$/i, "Invalid payment method ID"),
    }),
});

export const paymentMethodValidation = {
    createPaymentMethodZodSchema: paymentMethodZodSchema,
    updatePaymentMethodZodSchema,
    paymentMethodIdParamsSchema: z.object({
        params: z.object({
            id: z.string().regex(/^[0-9a-f]{24}$/i, "Invalid payment method ID"),
        }),
    }),
};
