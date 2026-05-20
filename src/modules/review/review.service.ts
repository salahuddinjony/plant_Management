import mongoose, { ClientSession } from "mongoose";
import AppError from "../../errors/AppError";
import { FOLDER_NAMES } from "../../constants/folder.constants";
import { deleteImage, uploadImage } from "../../utils/imageUpload";
import { ProductModel } from "../products/products.model";
import { ReviewModel } from "./review.model";

const REVIEW_POPULATE_USER = { path: "userId", select: "name emailOrPhone profilePicture avatarId" };

/** Use on any Product find query to expand `reviews` ObjectIds into full review documents. */
export const PRODUCT_REVIEWS_POPULATE = {
    path: "reviews",
    options: { sort: { createdAt: -1 } },
    populate: REVIEW_POPULATE_USER,
};

export const populateProductWithReviews = (productId: string) =>
    ProductModel.findById(productId).populate(PRODUCT_REVIEWS_POPULATE);

/** Backfill product.reviews[] from review docs (safe for existing production data). */
export const syncProductReviewIds = async (productId: string, session?: ClientSession) => {
    let q = ReviewModel.find({ productId }).select("_id");
    if (session) q = q.session(session);
    const docs = await q;
    const ids = docs.map((d) => d._id);
    await ProductModel.updateOne({ _id: productId }, { $set: { reviews: ids } }, { session });
};

export const updateProductRatingService = async (productId: string, session?: ClientSession) => {
    let reviewQuery = ReviewModel.find({ productId, isPublished: true });
    if (session) reviewQuery = reviewQuery.session(session);
    const reviews = await reviewQuery;

    if (reviews.length === 0) {
        await ProductModel.updateOne(
            { _id: productId },
            { ratingAverage: 0, ratingCount: 0 },
            { session }
        );
        return;
    }

    const averageRating =
        reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    await ProductModel.updateOne(
        { _id: productId },
        { ratingAverage: Math.round(averageRating * 10) / 10, ratingCount: reviews.length },
        { session }
    );
};

export const uploadReviewImages = async (files: Express.Multer.File[]) => {
    const urls: string[] = [];
    for (const file of files) {
        const { url } = await uploadImage(file.buffer, FOLDER_NAMES.REVIEW);
        urls.push(url);
    }
    return urls;
};

export const parseImagesFromBody = (images: unknown): string[] => {
    if (!images) return [];
    if (Array.isArray(images)) return images.filter((i) => typeof i === "string");
    if (typeof images === "string") {
        try {
            const parsed = JSON.parse(images);
            if (Array.isArray(parsed)) return parsed.filter((i) => typeof i === "string");
        } catch {
            return images.split(",").map((s) => s.trim()).filter(Boolean);
        }
    }
    return [];
};

export const createReviewService = async (
    userId: string,
    productId: string,
    rating: number,
    reviewText?: string,
    images: string[] = []
) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const product = await ProductModel.findById(productId).session(session);
        if (!product) {
            throw new AppError(404, "Product not found");
        }

        const [review] = await ReviewModel.create(
            [
                {
                    userId,
                    productId,
                    rating,
                    reviewText,
                    images,
                    isPublished: true,
                },
            ],
            { session }
        );

        await ProductModel.findByIdAndUpdate(
            productId,
            { $push: { reviews: review._id } },
            { session }
        );

        await updateProductRatingService(productId, session);
        await session.commitTransaction();

        const populatedProduct = await populateProductWithReviews(productId);
        return { review, product: populatedProduct };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

export const updateReviewService = async (
    reviewId: string,
    userId: string,
    updateData: { rating?: number; reviewText?: string; images?: string[] }
) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const review = await ReviewModel.findById(reviewId).session(session);
        if (!review) {
            throw new AppError(404, "Review not found");
        }
        if (review.userId.toString() !== userId) {
            throw new AppError(403, "You are not authorized to update this review");
        }

        if (updateData.rating !== undefined) {
            review.rating = updateData.rating;
        }
        if (updateData.reviewText !== undefined) {
            review.reviewText = updateData.reviewText;
        }
        if (updateData.images !== undefined) {
            const removed = (review.images || []).filter((url) => !updateData.images!.includes(url));
            for (const url of removed) {
                try {
                    await deleteImage(url);
                } catch (err) {
                    console.error("Failed to delete old review image:", err);
                }
            }
            review.images = updateData.images;
        }

        await review.save({ session });
        await updateProductRatingService(review.productId.toString(), session);
        await session.commitTransaction();

        const populatedProduct = await populateProductWithReviews(review.productId.toString());
        return { review, product: populatedProduct };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

export const deleteReviewService = async (reviewId: string, userId: string, role?: string) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const review = await ReviewModel.findById(reviewId).session(session);
        if (!review) {
            throw new AppError(404, "Review not found");
        }

        const isOwner = review.userId.toString() === userId;
        const isStaff = role === "admin" || role === "super-admin";
        if (!isOwner && !isStaff) {
            throw new AppError(403, "You are not authorized to delete this review");
        }

        const productId = review.productId.toString();

        await ProductModel.findByIdAndUpdate(
            productId,
            { $pull: { reviews: review._id } },
            { session }
        );

        await ReviewModel.findByIdAndDelete(reviewId).session(session);
        await updateProductRatingService(productId, session);
        await session.commitTransaction();

        if (review.images?.length) {
            for (const url of review.images) {
                try {
                    await deleteImage(url);
                } catch (err) {
                    console.error("Failed to delete review image:", err);
                }
            }
        }

        const populatedProduct = await populateProductWithReviews(productId);
        return { review, product: populatedProduct };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

export const publishReviewService = async (reviewId: string) => {
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
        throw new AppError(404, "Review not found");
    }

    review.isPublished = true;
    await review.save();
    await updateProductRatingService(review.productId.toString());
    return review;
};

export const unpublishReviewService = async (reviewId: string) => {
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
        throw new AppError(404, "Review not found");
    }

    review.isPublished = false;
    await review.save();
    await updateProductRatingService(review.productId.toString());
    return review;
};

export const getReviewsByProductService = async (productId: string) => {
    const product = await ProductModel.findById(productId);
    if (!product) {
        throw new AppError(404, "Product not found");
    }

    if (!product.reviews?.length) {
        await syncProductReviewIds(productId);
    }

    return ReviewModel.find({ productId, isPublished: true })
        .populate(REVIEW_POPULATE_USER)
        .sort({ createdAt: -1 });
};

export const getReviewsByUserService = async (userId: string) => {
    return ReviewModel.find({ userId })
        .populate("productId", "name image price ratingAverage")
        .sort({ createdAt: -1 });
};

export const addHelpfulReviewService = async (reviewId: string) => {
    const review = await ReviewModel.findByIdAndUpdate(
        reviewId,
        { $inc: { helpfulCount: 1 } },
        { new: true }
    );

    if (!review) {
        throw new AppError(404, "Review not found");
    }

    return review;
};

export const reviewServices = {
    createReviewService,
    updateReviewService,
    deleteReviewService,
    publishReviewService,
    unpublishReviewService,
    getReviewsByProductService,
    getReviewsByUserService,
    addHelpfulReviewService,
    updateProductRatingService,
    syncProductReviewIds,
    uploadReviewImages,
    parseImagesFromBody,
    populateProductWithReviews,
};
