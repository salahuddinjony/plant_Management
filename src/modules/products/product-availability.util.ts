import { USER_ROLE } from "../../constants/status.constants";
import AppError from "../../errors/AppError";

export const isAdminRole = (role?: string) =>
    role === USER_ROLE.ADMIN || role === USER_ROLE.SUPER_ADMIN;

/** Mongo filter for product catalog reads (list/detail). Admins see all products. */
export const catalogFilterForRole = (role?: string): Record<string, unknown> =>
    isAdminRole(role) ? {} : { isAvailable: true };

/** Strip isAvailable from query params so users cannot override the catalog filter. */
export const sanitizeCatalogQuery = (
    query: Record<string, unknown>,
    role?: string
): Record<string, unknown> => {
    if (isAdminRole(role)) {
        return query;
    }
    const sanitized = { ...query };
    delete sanitized.isAvailable;
    return sanitized;
};

export function assertProductPurchasable<T extends { isAvailable?: boolean }>(
    product: T | null
): asserts product is T {
    if (!product) {
        throw new AppError(404, "Product not found");
    }
    if (product.isAvailable === false) {
        throw new AppError(400, "This product is not available");
    }
}
