/** Staff role slugs (templates). Super-admin and admin are not staff roles. */
export const STAFF_ROLE_SLUGS = [
    "order-manager",
    "product-manager",
    "delivery-manager",
    "marketing",
] as const;

export type TStaffRoleSlug = (typeof STAFF_ROLE_SLUGS)[number];

export const isStaffRoleSlug = (value: string): value is TStaffRoleSlug =>
    (STAFF_ROLE_SLUGS as readonly string[]).includes(value);
