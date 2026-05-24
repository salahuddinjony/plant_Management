import { z } from "zod";
import { PURCHASE_DISCLAIMER_TYPES } from "./purchase-disclaimer.constants";

const disclaimerFieldsSchema = z.object({
    title: z.string().trim().min(1, "Title is required").max(200),
    message: z.string().trim().min(1, "Message is required").max(5000),
    type: z.enum(PURCHASE_DISCLAIMER_TYPES, {
        errorMap: () => ({ message: "Invalid disclaimer type" }),
    }),
    isActive: z.boolean().optional().default(true),
    orderNumber: z.coerce.number().int().min(1).optional(),
});

export const createPurchaseDisclaimerZodSchema = z.object({
    body: disclaimerFieldsSchema,
});

export const updatePurchaseDisclaimerZodSchema = z.object({
    body: disclaimerFieldsSchema.partial(),
    params: z.object({
        id: z.string().regex(/^[0-9a-f]{24}$/i, "Invalid disclaimer ID"),
    }),
});

export const purchaseDisclaimerIdParamsSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-f]{24}$/i, "Invalid disclaimer ID"),
    }),
});

export const reorderPurchaseDisclaimersZodSchema = z.object({
    body: z.object({
        orderedIds: z
            .array(z.string().regex(/^[0-9a-f]{24}$/i, "Invalid disclaimer ID"))
            .min(1, "orderedIds must not be empty"),
    }),
});
