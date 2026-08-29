import { model, Schema } from "mongoose";
import { TBlogComment, TBlogPost, TBlogReaction } from "./blog-post.interface";

const BlogPostSchema = new Schema<TBlogPost>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        image: {
            type: String,
        },
        images: {
            type: [String],
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const BlogReactionSchema = new Schema<TBlogReaction>(
    {
        blogPostId: {
            type: Schema.Types.ObjectId,
            ref: "blog_post",
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        reactionType: {
            type: String,
            enum: ["love"],
            default: "love",
        },
    },
    { timestamps: true }
);

BlogReactionSchema.index({ blogPostId: 1, userId: 1 }, { unique: true });
BlogReactionSchema.index({ blogPostId: 1, createdAt: -1 });

const BlogCommentSchema = new Schema<TBlogComment>(
    {
        blogPostId: {
            type: Schema.Types.ObjectId,
            ref: "blog_post",
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        comment: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
    },
    { timestamps: true }
);

BlogCommentSchema.index({ blogPostId: 1, createdAt: -1 });

export const BlogPostModel = model<TBlogPost>("blog_post", BlogPostSchema);
export const BlogReactionModel = model<TBlogReaction>("blog_reaction", BlogReactionSchema);
export const BlogCommentModel = model<TBlogComment>("blog_comment", BlogCommentSchema);
