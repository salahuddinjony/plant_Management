import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { formatCartResponse } from "../products/product-response.util";
import {
    addItemToCartService,
    clearCartService,
    getCartService,
    removeItemFromCartService,
    updateCartItemQuantityService,
} from "./cart.service";

export const addItemToCart = catchAsync(async (req: Request, res: Response) => {
    const { productId, quantity } = req.body;
    const userId = req.user?.id;

    const cart = await addItemToCartService(userId, productId, quantity);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Item added to cart successfully",
        data: formatCartResponse(cart, req.user?.role),
    });
});

export const removeItemFromCart = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params as { productId: string };
    const userId = req.user?.id;

    const cart = await removeItemFromCartService(userId, productId as string);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Item removed from cart successfully",
        data: formatCartResponse(cart, req.user?.role),
    });
});

export const updateCartItemQuantity = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params as { productId: string };
    const { quantity } = req.body;
    const userId = req.user?.id;

    const cart = await updateCartItemQuantityService(userId, productId as string, quantity);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Cart updated successfully",
        data: formatCartResponse(cart, req.user?.role),
    });
});

export const getCart = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    const cart = await getCartService(userId);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Cart retrieved successfully",
        data: formatCartResponse(cart, req.user?.role),
    });
});

export const clearCart = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    const cart = await clearCartService(userId);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Cart cleared successfully",
        data: formatCartResponse(cart, req.user?.role),
    });
});

export const cartController = {
    addItemToCart,
    removeItemFromCart,
    updateCartItemQuantity,
    getCart,
    clearCart,
};
