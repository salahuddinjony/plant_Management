import { z } from "zod";
import { STAFF_ROLE_SLUGS } from "../rbac/staff-role.constants";

const emailOrPhoneSchema = z
    .string()
    .trim()
    .min(1, "Email or phone is required")
    .refine(
        (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || /^\d{11}$/.test(val),
        { message: "Must be a valid email or 11-digit phone number" }
    );

export const inviteStaffZodSchema = z.object({
    body: z.object({
        name: z.string().trim().min(2, "Name is required"),
        emailOrPhone: emailOrPhoneSchema,
        staffRole: z.enum(STAFF_ROLE_SLUGS, {
            errorMap: () => ({ message: "Invalid staff role" }),
        }),
        permissions: z.array(z.string()).nullable().optional(),
    }),
});

export const acceptStaffInviteZodSchema = z.object({
    body: z.object({
        token: z.string().trim().min(1, "Invite token or code is required"),
        password: z.string().min(6, "Password must be at least 6 characters"),
    }),
});

export const updateStaffZodSchema = z.object({
    body: z.object({
        staffRole: z.enum(STAFF_ROLE_SLUGS).optional(),
        permissions: z.array(z.string()).optional(),
    }),
    params: z.object({
        staffUserId: z.string().regex(/^[0-9a-f]{24}$/i, "Invalid user ID"),
    }),
});

export const staffUserIdParamsSchema = z.object({
    params: z.object({
        staffUserId: z.string().regex(/^[0-9a-f]{24}$/i, "Invalid user ID"),
    }),
});
