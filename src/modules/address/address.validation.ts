import { z } from "zod";

const addressBodySchema = z.object({
    street: z
      .string()
      .trim()
      .min(2, "Street must be at least 3 characters")
      .optional()
      .or(z.literal("")),
    city: z.string().min(2, "City is required"),
    postalCode: z
      .string()
      .trim()
      .min(2, "Postal code must be at least 2 characters")
      .optional()
      .or(z.literal("")),
    country: z.string().min(2, "Country is required"),
    phoneNumber: z.string().optional(),
    label: z.enum(["home", "office", "other"]).default("other"),
    isDefault: z.coerce.boolean().default(false),
});

export const createAddressZodSchema = z.object({
    body: addressBodySchema,
});

export const updateAddressZodSchema = z.object({
    body: addressBodySchema.partial(),
});

export const addressValidation = {
    createAddressZodSchema,
    updateAddressZodSchema,
};
