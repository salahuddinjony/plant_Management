import { Types } from "mongoose";

export type TBlogPost = {
    title: string;
    description: string;
    /** Legacy first-image field retained for backward compatibility. */
    image?: string;
    images?: string[];
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};

export type TBlogReaction = {
    blogPostId: Types.ObjectId | string;
    userId: Types.ObjectId | string;
    reactionType: "love";
    createdAt?: Date;
    updatedAt?: Date;
};

export type TBlogComment = {
    blogPostId: Types.ObjectId | string;
    userId: Types.ObjectId | string;
    comment: string;
    createdAt?: Date;
    updatedAt?: Date;
};
