import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import {
    addHelpfulReviewService,
    createReviewService,
    deleteReviewService,
    getReviewsByProductService,
    getReviewsByUserService,
    parseImagesFromBody,
    publishReviewService,
    reviewServices,
    unpublishReviewService,
    uploadReviewImages,
    updateReviewService,
} from "./review.service";

const getUploadedImageFiles = (req: Request) => {
    if (Array.isArray(req.files)) {
        return req.files as Express.Multer.File[];
    }
    const files = req.files as { images?: Express.Multer.File[] } | undefined;
    return files?.images ?? [];
};

export const createReviewController = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id as string;
    const { productId, rating, reviewText } = req.body;

    const uploadedUrls = await uploadReviewImages(getUploadedImageFiles(req));
    const bodyImages = parseImagesFromBody(req.body.images);
    const images = [...bodyImages, ...uploadedUrls];

    const { review, product } = await createReviewService(
        userId,
        productId,
        Number(rating),
        reviewText,
        images
    );

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Review created successfully",
        data: { review, product },
    });
});

export const updateReviewController = catchAsync(async (req: Request, res: Response) => {
    const { reviewId } = req.params as { reviewId: string };
    const userId = req.user?.id as string;
    const { rating, reviewText } = req.body;

    const uploadedUrls = await uploadReviewImages(getUploadedImageFiles(req));
    let images: string[] | undefined;

    if (req.body.images !== undefined || uploadedUrls.length > 0) {
        const bodyImages = parseImagesFromBody(req.body.images);
        images = [...bodyImages, ...uploadedUrls];
    }

    const { review, product } = await updateReviewService(reviewId, userId, {
        ...(rating !== undefined && { rating: Number(rating) }),
        ...(reviewText !== undefined && { reviewText }),
        ...(images !== undefined && { images }),
    });

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Review updated successfully",
        data: { review, product },
    });
});

export const publishReviewController = catchAsync(async (req: Request, res: Response) => {
    const { reviewId } = req.params;

    const review = await publishReviewService(reviewId as string);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Review published successfully",
        data: review,
    });
});

export const unpublishReviewController = catchAsync(async (req: Request, res: Response) => {
    const { reviewId } = req.params as { reviewId: string };

    const review = await unpublishReviewService(reviewId as string);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Review unpublished successfully",
        data: review,
    });
});

export const getReviewsByProductController = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params as { productId: string };

    const reviews = await getReviewsByProductService(productId as string);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Reviews retrieved successfully",
        data: reviews,
    });
});

export const getReviewsByUserController = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id as string;

    const reviews = await getReviewsByUserService(userId);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Reviews retrieved successfully",
        data: reviews,
    });
});

export const addHelpfulReviewController = catchAsync(async (req: Request, res: Response) => {
    const { reviewId } = req.params as { reviewId: string };

    const review = await addHelpfulReviewService(reviewId as string);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Review marked as helpful",
        data: review,
    });
});

export const deleteReviewController = catchAsync(async (req: Request, res: Response) => {
    const { reviewId } = req.params as { reviewId: string };
    const userId = req.user?.id as string;
    const { review, product } = await deleteReviewService(reviewId, userId, {
        role: req.user?.role as string,
        permissions: req.user?.permissions as string[] | undefined,
    });

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Review deleted successfully",
        data: { review, product },
    });
});

export const reviewController = {
    createReviewController,
    updateReviewController,
    publishReviewController,
    unpublishReviewController,
    getReviewsByProductController,
    getReviewsByUserController,
    addHelpfulReviewController,
    deleteReviewController,
};
