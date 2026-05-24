import { z } from "zod";
import { MAX_PRODUCT_IMAGES, parseProductImagesFromBody } from "./product-images.util";

/** Multipart: JSON string `["url",...]`, array, or single URL (update: URLs to keep). */
const productImagesBodySchema = z.preprocess(
    (val) => {
        if (val === undefined || val === null) return undefined;
        if (typeof val === "string" && val.trim() === "") return undefined;
        const parsed = parseProductImagesFromBody(val);
        return parsed !== undefined ? parsed : val;
    },
    z
        .array(z.string().url({ message: "Invalid image URL" }))
        .max(MAX_PRODUCT_IMAGES, `At most ${MAX_PRODUCT_IMAGES} image URLs allowed`)
        .optional()
);

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
    images: productImagesBodySchema,
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
