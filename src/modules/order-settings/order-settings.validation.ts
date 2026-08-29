import { z } from "zod";

const categoryIdsSchema = z.preprocess(
    (value) => {
        if (value === undefined || value === null || value === "") return [];
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
            try {
                const parsed: unknown = JSON.parse(value);
                if (Array.isArray(parsed)) return parsed;
            } catch {
                // Let Zod report malformed input.
            }
        }
        return value;
    },
    z.array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid category ID"))
);

const taxSchema = z.object({
    isActive: z.coerce.boolean().default(true),
    taxType: z.enum(["percentage", "fixed"]),
    taxValue: z.coerce.number().min(0),
});

const createTaxSchema = z
    .object({
        isActive: z.coerce.boolean().default(false),
        taxType: z.enum(["percentage", "fixed"]).optional(),
        taxValue: z.coerce.number().min(0).optional(),
    })
    .optional()
    .superRefine((tax, ctx) => {
        if (!tax || tax.isActive !== true) return;

        if (!tax.taxType) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "taxType is required when tax.isActive is true",
                path: ["taxType"],
            });
        }
        if (tax.taxValue === undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "taxValue is required when tax.isActive is true",
                path: ["taxValue"],
            });
        }
    });

const shippingFieldsSchema = z.object({
    shippingType: z.enum(["flat", "free_above_threshold", "free"]),
    shippingFlatAmount: z.coerce.number().min(0).optional(),
    freeShippingMinSubtotal: z.coerce.number().min(0).optional(),
    categoryIds: categoryIdsSchema.optional(),
});

const validateShippingShape = (
    data: z.infer<typeof shippingFieldsSchema>,
    ctx: z.RefinementCtx
) => {
    if (data.shippingType === "flat") {
        if (data.shippingFlatAmount === undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "shippingFlatAmount is required when shippingType is flat",
                path: ["shippingFlatAmount"],
            });
        }
        return;
    }

    if (data.shippingType === "free_above_threshold") {
        if (data.shippingFlatAmount === undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "shippingFlatAmount is required when shippingType is free_above_threshold",
                path: ["shippingFlatAmount"],
            });
        }
        if (data.freeShippingMinSubtotal === undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "freeShippingMinSubtotal is required when shippingType is free_above_threshold",
                path: ["freeShippingMinSubtotal"],
            });
        }
    }
};

const shippingSchema = shippingFieldsSchema.superRefine(validateShippingShape);

const createOrderSettingsBodySchema = z
    .object({
        name: z.string().trim().min(2).optional(),
        isDefault: z.coerce.boolean().optional(),
        setAsActive: z.coerce.boolean().default(false),
        tax: createTaxSchema,
        shipping: shippingSchema,
    })
    .superRefine((data, ctx) => {
        const categoryIds = data.shipping.categoryIds ?? [];

        if (data.isDefault === true && categoryIds.length > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A default delivery setting cannot have categories",
                path: ["shipping", "categoryIds"],
            });
        }

        if (data.isDefault === false && categoryIds.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Select at least one category for a category delivery setting",
                path: ["shipping", "categoryIds"],
            });
        }

        if (data.isDefault === false && !data.name?.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Name is required for a category delivery setting",
                path: ["name"],
            });
        }
    });

const updateOrderSettingsBodySchema = z
    .object({
        name: z.string().trim().min(2).optional(),
        isDefault: z.coerce.boolean().optional(),
        setAsActive: z.coerce.boolean().optional(),
        tax: taxSchema.partial().optional(),
        shipping: shippingFieldsSchema.partial().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field is required for update",
    });

export const createOrderSettingsZodSchema = z.object({
    body: createOrderSettingsBodySchema,
});

export const updateOrderSettingsZodSchema = z.object({
    body: updateOrderSettingsBodySchema,
});

export const orderSettingsValidation = {
    createOrderSettingsZodSchema,
    updateOrderSettingsZodSchema,
};
