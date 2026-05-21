import { ClientSession } from "mongoose";
import AppError from "../../errors/AppError";
import { ProductModel } from "./products.model";

export type OrderInventoryItem = {
    productId: { toString(): string } | string;
    name?: string;
    quantity: number;
};

export const assertSufficientStock = async (
    items: OrderInventoryItem[],
    session?: ClientSession
) => {
    for (const item of items) {
        const productId = item.productId.toString();
        let query = ProductModel.findById(productId).select("name available");
        if (session) query = query.session(session);
        const product = await query;

        if (!product) {
            throw new AppError(404, "Product not found for order item");
        }

        const stock = product.available ?? 0;
        if (stock < item.quantity) {
            throw new AppError(
                400,
                `Insufficient stock for "${product.name || item.name || "product"}". Available: ${stock}, requested: ${item.quantity}`
            );
        }
    }
};

export const applyOrderInventory = async (
    items: OrderInventoryItem[],
    session?: ClientSession
) => {
    for (const item of items) {
        await ProductModel.updateOne(
            { _id: item.productId.toString() },
            {
                $inc: {
                    sold: item.quantity,
                    available: -item.quantity,
                },
            },
            { session }
        );
    }
};

export const revertOrderInventory = async (
    items: OrderInventoryItem[],
    session?: ClientSession
) => {
    for (const item of items) {
        const productId = item.productId.toString();
        await ProductModel.updateOne(
            { _id: productId },
            {
                $inc: {
                    sold: -item.quantity,
                    available: item.quantity,
                },
            },
            { session }
        );
        await ProductModel.updateOne(
            { _id: productId, sold: { $lt: 0 } },
            { $set: { sold: 0 } },
            { session }
        );
    }
};
