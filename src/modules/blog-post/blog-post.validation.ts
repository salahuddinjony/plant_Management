import { z } from "zod";

const blogPostFieldsSchema = z.object({
    title: z.string().trim().min(2, "Title must be at least 2 characters long"),
    description: z.string().trim().min(1, "Description is required"),
    isActive: z.coerce.boolean().default(true),
});

export const createBlogPostZodSchema = z.object({
    body: blogPostFieldsSchema,
});

export const updateBlogPostZodSchema = z.object({
    body: blogPostFieldsSchema.partial(),
});

export const createBlogCommentZodSchema = z.object({
    body: z.object({
        comment: z.string().trim().min(1, "Comment is required").max(2000),
    }),
});

export const blogPostValidation = {
    createBlogPostZodSchema,
    updateBlogPostZodSchema,
    createBlogCommentZodSchema,
};
