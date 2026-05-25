import { enrichOrdersWithProducts } from "./order-product-enrich.util";
import { toPlainOrder } from "./order-plain.util";
import { enrichOrdersWithUsers } from "./order-user-enrich.util";

const omitBillingAddress = <T>(orders: T[]) =>
    orders.map((order) => {
        const plain = toPlainOrder(order);
        delete plain.billingAddress;
        return plain;
    });

/** Customer my-orders / order detail: product image on lines, no billingAddress in JSON. */
export const formatOrdersForUserResponse = async <T extends { items?: Array<{ productId?: unknown }> }>(
    orders: T[]
) => {
    const withProducts = await enrichOrdersWithProducts(orders);
    return omitBillingAddress(withProducts);
};

/** Admin list/detail: populate user + products, omit billingAddress from JSON. */
export const formatOrdersForAdminResponse = async <T extends { items?: Array<{ productId?: unknown }>; userId?: unknown }>(
    orders: T[]
) => {
    const withUsers = await enrichOrdersWithUsers(orders);
    const withProducts = await enrichOrdersWithProducts(withUsers);
    return omitBillingAddress(withProducts);
};
