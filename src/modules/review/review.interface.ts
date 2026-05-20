import { Types } from "mongoose";

export type TReview = {
    userId: Types.ObjectId;
    productId: Types.ObjectId;
    rating: number;
    reviewText?: string;
    images?: string[];
    /** @deprecated Kept for production DB compatibility; new reviews default to true */
    isPublished?: boolean;
    /** @deprecated Kept for production DB compatibility */
    helpfulCount?: number;
    createdAt: Date;
    updatedAt: Date;
};
