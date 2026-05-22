import { z } from "zod";
import { ADDRESS_LABELS, DEFAULT_ADDRESS_LABEL } from "./address.constants";

const streetSchema = z
    .string()
    .trim()
    .min(2, "Street must be at least 2 characters")
    .optional()
    .or(z.literal(""));

const postalCodeSchema = z
    .string()
    .trim()
    .min(2, "Postal code must be at least 2 characters")
    .optional()
    .or(z.literal(""));

const labelSchema = z.enum(ADDRESS_LABELS);

const phoneNumberSchema = z
    .string({ required_error: "Phone number is required" })
    .trim()
    .regex(/^\d{10,15}$/, "Phone number must be 10–15 digits");

const addressBodySchema = z.object({
    street: streetSchema,
    city: z.string().min(2, "City is required"),
    postalCode: postalCodeSchema,
    country: z.string().min(2, "Country is required"),
    phoneNumber: phoneNumberSchema,
    label: labelSchema.optional().default(DEFAULT_ADDRESS_LABEL),
    isDefault: z.coerce.boolean().default(false),
});

const updateAddressBodySchema = z.object({
    street: streetSchema,
    city: z.string().min(2, "City is required").optional(),
    postalCode: postalCodeSchema,
    country: z.string().min(2, "Country is required").optional(),
    phoneNumber: phoneNumberSchema.optional(),
    label: labelSchema.optional(),
    isDefault: z.coerce.boolean().optional(),
});

export const createAddressZodSchema = z.object({
    body: addressBodySchema,
});

export const updateAddressZodSchema = z.object({
    body: updateAddressBodySchema,
});

export const addressValidation = {
    createAddressZodSchema,
    updateAddressZodSchema,
};
