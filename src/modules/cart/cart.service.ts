import AppError from "../../errors/AppError";
import { assertProductPurchasable } from "../products/product-availability.util";
import { getDiscountedUnitPrice, getLineTotal } from "../products/product-price.util";
import { ProductModel } from "../products/products.model";
import type { HydratedDocument } from "mongoose";
import { TCart } from "./cart.interface";
import { CartModel } from "./cart.model";

export const addItemToCartService = async (userId: string, productId: string, quantity: number) => {
    const foundProduct = await ProductModel.findById(productId);
    assertProductPurchasable(foundProduct);
    const product = foundProduct;

    let cart = await CartModel.findOne({ userId });
    if (!cart) {
        cart = await CartModel.create({
            userId,
            items: [],
        });
    }

    const existingItem = cart.items.find((item) => item.productId === productId);
    const inCart = existingItem?.quantity ?? 0;
    const requestedTotal = inCart + quantity;
    const stock = product.available ?? 0;

    if (stock < requestedTotal) {
        throw new AppError(400, "Insufficient stock available");
    }

    const unitPrice = getDiscountedUnitPrice(product.price, product.discount ?? 0);

    if (existingItem) {
        existingItem.price = unitPrice;
        existingItem.quantity += quantity;
        existingItem.total = getLineTotal(unitPrice, existingItem.quantity);
    } else {
        cart.items.push({
            productId,
            quantity,
            price: unitPrice,
            total: getLineTotal(unitPrice, quantity),
        });
    }

    // Recalculate totals
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.total, 0);
    cart.total = cart.subtotal;

    await cart.save();
    return cart.populate("items.productId");
};

export const removeItemFromCartService = async (userId: string, productId: string) => {
    const cart = await CartModel.findOne({ userId });
    if (!cart) {
        throw new AppError(404, "Cart not found");
    }

    cart.items = cart.items.filter((item) => item.productId !== productId);

    // Recalculate totals
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.total, 0);
    cart.total = cart.subtotal;

    await cart.save();
    return cart.populate("items.productId");
};

export const updateCartItemQuantityService = async (userId: string, productId: string, quantity: number) => {
    if (quantity <= 0) {
        throw new AppError(400, "Quantity must be greater than 0");
    }

    const foundProduct = await ProductModel.findById(productId);
    assertProductPurchasable(foundProduct);
    const product = foundProduct;

    const stock = product.available ?? 0;
    if (stock < quantity) {
        throw new AppError(400, "Insufficient stock available");
    }

    const cart = await CartModel.findOne({ userId });
    if (!cart) {
        throw new AppError(404, "Cart not found");
    }

    const item = cart.items.find((item) => item.productId === productId);
    if (!item) {
        throw new AppError(404, "Item not in cart");
    }

    const unitPrice = getDiscountedUnitPrice(product.price, product.discount ?? 0);
    item.price = unitPrice;
    item.quantity = quantity;
    item.total = getLineTotal(unitPrice, quantity);

    // Recalculate totals
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.total, 0);
    cart.total = cart.subtotal;

    await cart.save();
    return cart.populate("items.productId");
};

const pruneUnavailableCartItems = async (cart: HydratedDocument<TCart>) => {
    if (!cart) return cart;

    const before = cart.items.length;
    cart.items = cart.items.filter(
        (item) => item.productId != null && typeof item.productId === "object"
    );

    if (cart.items.length < before) {
        cart.subtotal = cart.items.reduce((sum, item) => sum + item.total, 0);
        cart.total = cart.subtotal;
        await cart.save();
    }

    return cart;
};

export const getCartService = async (userId: string) => {
    let cart = await CartModel.findOne({ userId }).populate({
        path: "items.productId",
        match: { isAvailable: true },
    });
    if (!cart) {
        throw new AppError(404, "Cart not found");
    }

    cart = await pruneUnavailableCartItems(cart);
    return cart;
};

export const clearCartService = async (userId: string) => {
    const cart = await CartModel.findOne({ userId });
    if (!cart) {
        throw new AppError(404, "Cart not found");
    }

    cart.items = [];
    cart.subtotal = 0;
    cart.total = 0;

    await cart.save();
    return cart;
};

export const cartService = {
    addItemToCartService,
    removeItemFromCartService,
    updateCartItemQuantityService,
    getCartService,
    clearCartService,
};
