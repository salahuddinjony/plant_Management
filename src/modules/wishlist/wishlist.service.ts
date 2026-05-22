import { Types } from "mongoose";
import AppError from "../../errors/AppError";
import { assertProductPurchasable } from "../products/product-availability.util";
import { ProductModel } from "../products/products.model";
import { WishlistModel } from "./wishlist.model";

/**
 * Add a product to the wishlist
 * @param userId - The ID of the user to add the product to
 * @param productId - The ID of the product to add to the wishlist
 * @returns The updated wishlist
 */
export const addToWishlistService = async (userId: string, productId: string) => {
    const foundProduct = await ProductModel.findById(productId);
    assertProductPurchasable(foundProduct);

    let wishlist = await WishlistModel.findOne({ userId });
    if (!wishlist) {
        wishlist = await WishlistModel.create({
            userId,
            productIds: [new Types.ObjectId(productId)],
        });
    } else {
        if (!wishlist.productIds.some((id) => id.toString() === productId)) {
            wishlist.productIds.push(new Types.ObjectId(productId));
        }
        await wishlist.save();
    }

    return wishlist.populate({
        path: "productIds",
        match: { isAvailable: true },
    });
};

/**
 * Remove a product from the wishlist
 * @param userId - The ID of the user to remove the product from
 * @param productId - The ID of the product to remove from the wishlist
 * @returns The updated wishlist
 */
export const removeFromWishlistService = async (userId: string, productId: string) => {
    const wishlist = await WishlistModel.findOne({ userId });
    if (!wishlist) {
        throw new AppError(404, "Wishlist not found");
    }

    wishlist.productIds = wishlist.productIds.filter((id) => id.toString() !== productId);
    await wishlist.save();

    return wishlist.populate({
        path: "productIds",
        match: { isAvailable: true },
    });
};

/**
 * Get the wishlist of a user
 * @param userId - The ID of the user to get the wishlist of
 * @returns The wishlist of the user
 */
export const getWishlistService = async (userId: string) => {
    const wishlist = await WishlistModel.findOne({ userId }).populate({
        path: "productIds",
        match: { isAvailable: true },
    });
    if (!wishlist) {
        throw new AppError(404, "Wishlist not found");
    }

    const availableIds = wishlist.productIds.filter((id) => id != null);
    if (availableIds.length < wishlist.productIds.length) {
        wishlist.productIds = availableIds as typeof wishlist.productIds;
        await wishlist.save();
    }

    return wishlist;
};

export const checkIfInWishlistService = async (userId: string, productId: string) => {
    const wishlist = await WishlistModel.findOne({ userId });
    if (!wishlist) {
        return false;
    }
    return wishlist.productIds.some((id) => id.toString() === productId);
};

export const clearWishlistService = async (userId: string) => {
    const wishlist = await WishlistModel.findOne({ userId });
    if (!wishlist) {
        throw new AppError(404, "Wishlist not found");
    }

    wishlist.productIds = [];
    await wishlist.save();

    return wishlist;
};

export const wishlistService = {
    addToWishlistService,
    removeFromWishlistService,
    getWishlistService,
    checkIfInWishlistService,
    clearWishlistService,
};
