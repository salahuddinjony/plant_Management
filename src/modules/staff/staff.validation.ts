import { z } from "zod";
import { USER_STATUS } from "../../constants/status.constants";
import { ALL_PERMISSION_VALUES } from "../rbac/permissions.constants";
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

const permissionSlugSchema = z.enum(
    ALL_PERMISSION_VALUES as unknown as [string, ...string[]]
);

export const updateStaffZodSchema = z.object({
    body: z
        .object({
            staffRole: z.enum(STAFF_ROLE_SLUGS).optional(),
            /** Full permission list, or `[]` to reset to the role template defaults. */
            permissions: z.array(permissionSlugSchema).optional(),
        })
        .refine((body) => body.staffRole !== undefined || body.permissions !== undefined, {
            message: "Provide staffRole and/or permissions to update",
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

export const updateStaffStatusZodSchema = z.object({
    params: z.object({
        staffUserId: z.string().regex(/^[0-9a-f]{24}$/i, "Invalid user ID"),
    }),
    body: z.object({
        status: z.enum(
            [USER_STATUS.ACTIVE, USER_STATUS.INACTIVE, USER_STATUS.BLOCKED] as [
                string,
                ...string[],
            ],
            { invalid_type_error: "Status must be active, inactive, or blocked" }
        ),
    }),
});
