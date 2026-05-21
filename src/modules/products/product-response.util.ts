import { USER_ROLE } from "../../constants/status.constants";

const isAdminRole = (role?: string) =>
    role === USER_ROLE.ADMIN || role === USER_ROLE.SUPER_ADMIN;

const toPlainProduct = (product: unknown): Record<string, unknown> => {
    if (!product || typeof product !== "object") {
        return {};
    }
    const doc = product as { toObject?: () => Record<string, unknown> };
    return typeof doc.toObject === "function" ? doc.toObject() : { ...(product as Record<string, unknown>) };
};

const normalizeProductImages = (plain: Record<string, unknown>): Record<string, unknown> => {
    const { image: _legacyImage, ...rest } = plain;
    let images = rest.images as string[] | undefined;

    if (!images?.length && _legacyImage) {
        images = [_legacyImage as string];
    }

    return { ...rest, images: images ?? [] };
};

/**
 * Responses use `images` only (no `image`).
 * Admin/super-admin: include `quantity` (= available).
 */
export const formatProductResponse = (product: unknown, role?: string) => {
    if (!product) return product;

    const plain = normalizeProductImages(toPlainProduct(product));
    const available = (plain.available as number) ?? 0;

    if (isAdminRole(role)) {
        return { ...plain, quantity: available };
    }

    const { quantity: _removed, ...forUser } = plain;
    return forUser;
};

export const formatProductsResponse = (products: unknown[], role?: string) =>
    products.map((p) => formatProductResponse(p, role));

/** Format cart items' populated productId by role */
export const formatCartResponse = (cart: unknown, role?: string) => {
    if (!cart) return cart;

    const plain = toPlainProduct(cart);
    const items = plain.items;

    if (!Array.isArray(items)) {
        return plain;
    }

    return {
        ...plain,
        items: items.map((item) => {
            const row = item as Record<string, unknown>;
            return {
                ...row,
                productId: formatProductResponse(row.productId, role),
            };
        }),
    };
};
