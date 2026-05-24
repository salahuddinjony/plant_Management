import { enrichOrdersWithProducts } from "./order-product-enrich.util";
import { enrichOrdersWithUsers } from "./order-user-enrich.util";

const toPlainOrder = <T>(order: T): Record<string, unknown> => {
    const doc = order as { toObject?: () => Record<string, unknown> };
    return typeof doc.toObject === "function" ? doc.toObject() : { ...(order as Record<string, unknown>) };
};

/** Admin list/detail: populate user + products, omit billingAddress from JSON. */
export const formatOrdersForAdminResponse = async <T extends { items?: Array<{ productId?: unknown }>; userId?: unknown }>(
    orders: T[]
) => {
    const withUsers = await enrichOrdersWithUsers(orders);
    const withProducts = await enrichOrdersWithProducts(withUsers);

    return withProducts.map((order) => {
        const plain = toPlainOrder(order);
        delete plain.billingAddress;
        return plain;
    });
};
