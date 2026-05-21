import AppError from "../../errors/AppError";
import { ProductModel } from "../products/products.model";
import { CartModel } from "./cart.model";

export const addItemToCartService = async (userId: string, productId: string, quantity: number) => {
    const product = await ProductModel.findById(productId);
    if (!product) {
        throw new AppError(404, "Product not found");
    }

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

    if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.total = existingItem.quantity * existingItem.price;
    } else {
        cart.items.push({
            productId,
            quantity,
            price: product.price!,
            total: product.price! * quantity,
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

    const product = await ProductModel.findById(productId);
    if (!product) {
        throw new AppError(404, "Product not found");
    }

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

    item.quantity = quantity;
    item.total = item.quantity * item.price;

    // Recalculate totals
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.total, 0);
    cart.total = cart.subtotal;

    await cart.save();
    return cart.populate("items.productId");
};

export const getCartService = async (userId: string) => {
    const cart = await CartModel.findOne({ userId }).populate("items.productId");
    if (!cart) {
        throw new AppError(404, "Cart not found");
    }
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
