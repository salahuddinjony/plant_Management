import { z } from "zod";

const productFieldsSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters long"),
    description: z.string().optional(),
    price: z.coerce.number().min(0, "Price must be a positive number"),
    discount: z.coerce.number().min(0).max(100).optional(),
    isAvailable: z.coerce.boolean().default(true),
    isFeatured: z.coerce.boolean().optional(),
    sku: z.string().optional(),
    brand: z.string().optional(),
    categoryId: z.string().optional(),
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    deliveryTime: z.string().optional(),
    courierCharge: z.coerce.number().min(0, "Courier charge must be a positive number").optional(),
    images: z.union([z.array(z.string().url()), z.string().url()]).optional(),
});

const createProductBodySchema = productFieldsSchema.extend({
    quantity: z.coerce.number().min(1, "Quantity is required and must be 1 or greater"),
});

const updateProductBodySchema = productFieldsSchema
    .extend({
        quantity: z.coerce.number().min(0).optional(),
        sold: z.coerce.number().min(0).optional(),
    })
    .partial();

export const createProductZodSchema = z.object({
    body: createProductBodySchema,
});

export const updateProductZodSchema = z.object({
    body: updateProductBodySchema,
});

export const productValidation = {
    createProductZodSchema,
    updateProductZodSchema,
};
