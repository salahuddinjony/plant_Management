import { Types } from "mongoose";
import { ProductModel } from "../products/products.model";
import { toPlainLineItem, toPlainOrder } from "./order-plain.util";

const PRODUCT_SELECT = "images";

/** Admin order line: product ref with first image only. */
export const formatProductRefForOrderLine = (product: {
    _id?: Types.ObjectId | string;
    images?: string[];
} | null | undefined) => {
    if (!product) return null;
    const images = product.images;
    return {
        _id: product._id,
        image: Array.isArray(images) && images.length > 0 ? images[0] : null,
    };
};

const shapeLineProductId = (productId: unknown): unknown => {
    if (!productId) return productId;
    if (typeof productId === "string" || productId instanceof Types.ObjectId) {
        return productId;
    }
    if (typeof productId === "object" && productId !== null && "images" in productId) {
        return formatProductRefForOrderLine(
            productId as { _id?: Types.ObjectId | string; images?: string[] }
        );
    }
    return productId;
};

const toProductIdString = (productId: unknown): string | null => {
    if (!productId) return null;
    if (typeof productId === "string") return productId;
    if (productId instanceof Types.ObjectId) return productId.toString();
    if (typeof productId === "object" && productId !== null && "_id" in productId) {
        const id = (productId as { _id?: Types.ObjectId | string })._id;
        return id ? String(id) : null;
    }
    return String(productId);
};

/**
 * Attach product documents to order line items (reliable for nested items.productId).
 */
export const enrichOrdersWithProducts = async <T extends { items?: Array<{ productId?: unknown }> }>(
    orders: T[]
) => {
    if (orders.length === 0) return orders;

    const plainOrders = orders.map((order) => toPlainOrder(order));

    const productIdStrings = [
        ...new Set(
            plainOrders.flatMap((order) =>
                ((order.items as Array<{ productId?: unknown }>) ?? [])
                    .map((item) => toProductIdString(item.productId))
                    .filter((id): id is string => Boolean(id))
            )
        ),
    ];

    if (productIdStrings.length === 0) return plainOrders;

    const objectIds = productIdStrings
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));

    const products = await ProductModel.find({ _id: { $in: objectIds } }).select(PRODUCT_SELECT).lean();
    const productById = new Map(products.map((p) => [String(p._id), p]));

    return plainOrders.map((plain) => {
        const items = (plain.items as Array<{ productId?: unknown }> | undefined) ?? [];

        plain.items = items.map((item) => {
            const line = toPlainLineItem(item);
            const key = toProductIdString(line.productId);
            if (key && productById.has(key)) {
                line.productId = formatProductRefForOrderLine(productById.get(key)!);
            } else {
                line.productId = shapeLineProductId(line.productId);
            }
            return line;
        });

        return plain as T;
    });
};
