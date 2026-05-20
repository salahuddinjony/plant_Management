import { z } from "zod";

const objectIdRegex = /^[0-9a-f]{24}$/i;

const reviewBodySchema = z.object({
    productId: z.string().regex(objectIdRegex, "Invalid product ID"),
    rating: z.coerce.number().min(1, "Rating must be between 1-5").max(5, "Rating must be between 1-5"),
    reviewText: z.string().trim().optional(),
    images: z
        .union([z.array(z.string()), z.string()])
        .optional(),
    isPublished: z.coerce.boolean().optional(),
});

export const createReviewZodSchema = z.object({
    body: reviewBodySchema,
});

export const updateReviewZodSchema = z.object({
    body: z.object({
        rating: z.coerce.number().min(1).max(5).optional(),
        reviewText: z.string().trim().optional(),
        images: z.union([z.array(z.string()), z.string()]).optional(),
    }),
});

export const reviewValidation = {
    createReviewZodSchema,
    updateReviewZodSchema,
};
