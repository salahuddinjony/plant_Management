import { model, Schema } from "mongoose";
import { TReview } from "./review.interface";

const ReviewSchema = new Schema<TReview>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: "product",
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        reviewText: {
            type: String,
            trim: true,
        },
        images: {
            type: [String],
            default: [],
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
        helpfulCount: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

ReviewSchema.index({ userId: 1, productId: 1 });
ReviewSchema.index({ productId: 1, createdAt: -1 });

export const ReviewModel = model<TReview>("review", ReviewSchema);
