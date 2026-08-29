import { PERMISSIONS, TPermission } from "./permissions.constants";
import { TStaffRoleSlug } from "./staff-role.constants";

export type TRoleTemplate = {
    slug: TStaffRoleSlug;
    name: string;
    description: string;
    permissions: TPermission[];
};

export const STAFF_ROLE_TEMPLATES: TRoleTemplate[] = [
    {
        slug: "order-manager",
        name: "Order Manager",
        description: "Read all data; full access to orders and payment status.",
        permissions: [
            PERMISSIONS.READ_ALL,
            PERMISSIONS.ORDERS_READ,
            PERMISSIONS.ORDERS_WRITE,
            PERMISSIONS.ORDERS_UPDATE_STATUS,
            PERMISSIONS.ORDERS_UPDATE_PAYMENT,
            PERMISSIONS.TRANSACTIONS_READ,
            PERMISSIONS.USERS_READ,
        ],
    },
    {
        slug: "product-manager",
        name: "Product Manager",
        description: "Read all; manage products, categories, flash sales, and carousels.",
        permissions: [
            PERMISSIONS.READ_ALL,
            PERMISSIONS.PRODUCTS_WRITE,
            PERMISSIONS.CATEGORIES_WRITE,
            PERMISSIONS.FLASH_SALES_WRITE,
            PERMISSIONS.CAROUSELS_WRITE,
            PERMISSIONS.POLICIES_WRITE,
        ],
    },
    {
        slug: "delivery-manager",
        name: "Delivery Manager",
        description: "Read all; delivery settings, payment methods, order and payment status.",
        permissions: [
            PERMISSIONS.READ_ALL,
            PERMISSIONS.ORDER_SETTINGS_WRITE,
            PERMISSIONS.PAYMENT_METHODS_WRITE,
            PERMISSIONS.ORDERS_UPDATE_STATUS,
            PERMISSIONS.ORDERS_UPDATE_PAYMENT,
        ],
    },
    {
        slug: "marketing",
        name: "Marketing",
        description: "Read all; manage contact, blog posts, carousels, and avatars.",
        permissions: [
            PERMISSIONS.READ_ALL,
            PERMISSIONS.CONTACTS_WRITE,
            PERMISSIONS.BLOGS_WRITE,
            PERMISSIONS.POLICIES_WRITE,
            PERMISSIONS.CAROUSELS_WRITE,
            PERMISSIONS.AVATARS_WRITE,
        ],
    },
];

const templateBySlug = new Map(STAFF_ROLE_TEMPLATES.map((t) => [t.slug, t]));

export const getStaffRoleTemplate = (slug: TStaffRoleSlug): TRoleTemplate => {
    const template = templateBySlug.get(slug);
    if (!template) {
        throw new Error(`Unknown staff role template: ${slug}`);
    }
    return template;
};

export const resolveStaffPermissions = (
    staffRole: TStaffRoleSlug,
    override?: string[] | null
): string[] => {
    if (override && override.length > 0) {
        return [...new Set(override)];
    }
    return [...getStaffRoleTemplate(staffRole).permissions];
};
