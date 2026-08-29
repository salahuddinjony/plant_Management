import { Types } from "mongoose";
import QueryBuilder from "../../builder/QueryBuilder";
import { FOLDER_NAMES } from "../../constants/folder.constants";
import AppError from "../../errors/AppError";
import { PERMISSIONS } from "../rbac/permissions.constants";
import {
    getEffectivePermissions,
    hasPermission,
    isFullAccessRole,
} from "../rbac/rbac.utils";
import { deleteImage, uploadImage } from "../../utils/imageUpload";
import { TBlogPost } from "./blog-post.interface";
import {
    BlogCommentModel,
    BlogPostModel,
    BlogReactionModel,
} from "./blog-post.model";

const assertValidId = (id: string, label = "blog post ID") => {
    if (!Types.ObjectId.isValid(id)) {
        throw new AppError(400, `Invalid ${label}`);
    }
};

const getBlogPostOrThrow = async (blogPostId: string, includeInactive = false) => {
    assertValidId(blogPostId);
    const filter = includeInactive ? { _id: blogPostId } : { _id: blogPostId, isActive: true };
    const post = await BlogPostModel.findOne(filter);
    if (!post) {
        throw new AppError(404, "Blog post not found");
    }
    return post;
};

const userPopulate = {
    path: "userId",
    select: "name emailOrPhone profilePicture avatarId",
    populate: { path: "avatarId", select: "name imageUrl" },
};

const getPostImages = (post: { images?: string[]; image?: string }) => {
    if (Array.isArray(post.images) && post.images.length > 0) {
        return [...post.images];
    }
    return post.image ? [post.image] : [];
};

const toBlogPostResponse = (post: any) => {
    const plain = post.toObject ? post.toObject() : post;
    const images = getPostImages(post);
    return {
        ...plain,
        images,
        image: images[0] ?? null,
    };
};

const getBlogEngagement = async (blogPostId: string, currentUserId?: string) => {
    const [loveCount, lovedByCurrentUser, lovedUsers, comments] = await Promise.all([
        BlogReactionModel.countDocuments({ blogPostId, reactionType: "love" }),
        currentUserId
            ? BlogReactionModel.exists({ blogPostId, userId: currentUserId, reactionType: "love" })
            : Promise.resolve(false),
        BlogReactionModel.find({ blogPostId, reactionType: "love" })
            .sort({ createdAt: -1 })
            .populate(userPopulate)
            .lean(),
        BlogCommentModel.find({ blogPostId })
            .sort({ createdAt: -1 })
            .populate(userPopulate)
            .lean(),
    ]);

    return {
        loveCount,
        lovedByCurrentUser: Boolean(lovedByCurrentUser),
        lovedUsers,
        comments,
    };
};

export const createBlogPostService = async (blogPostData: TBlogPost) => {
    const post = await BlogPostModel.create(blogPostData);
    return toBlogPostResponse(post);
};

export const getAllBlogPostsService = async (
    query: Record<string, unknown>,
    includeInactive = false
) => {
    const baseFilter = includeInactive ? {} : { isActive: true };
    const postQuery = new QueryBuilder(BlogPostModel.find(baseFilter), query)
        .search(["title"])
        .filter()
        .sort()
        .paginate()
        .fields();
    const posts = (await postQuery.modelQuery.lean()).map(toBlogPostResponse);
    const meta = await postQuery.countTotal();
    return { posts, meta };
};

export const getBlogPostByIdService = async (
    blogPostId: string,
    currentUserId?: string,
    includeInactive = false
) => {
    const post = await getBlogPostOrThrow(blogPostId, includeInactive);
    const engagement = await getBlogEngagement(blogPostId, currentUserId);
    return { ...toBlogPostResponse(post), ...engagement };
};

export const updateBlogPostService = async (
    blogPostId: string,
    blogPostData: Partial<TBlogPost> & { files?: Express.Multer.File[] }
) => {
    const post = await getBlogPostOrThrow(blogPostId, true);
    const oldImages = getPostImages(post);
    const newFiles = blogPostData.files ?? [];
    delete blogPostData.files;

    if (newFiles.length > 0) {
        const uploadedImages = await Promise.all(
            newFiles.map(async (file) => {
                const uploadResult = await uploadImage(file.buffer, FOLDER_NAMES.BLOG);
                return uploadResult.url;
            })
        );
        post.images = uploadedImages;
        post.image = uploadedImages[0];
    }

    Object.assign(post, blogPostData);
    await post.save();

    if (newFiles.length > 0) {
        await Promise.all(
            oldImages.map(async (imageUrl) => {
                try {
                    await deleteImage(imageUrl);
                } catch (error) {
                    console.error("Failed to delete old blog image:", error);
                }
            })
        );
    }

    return toBlogPostResponse(post);
};

export const deleteBlogPostService = async (blogPostId: string) => {
    const post = await getBlogPostOrThrow(blogPostId, true);
    await Promise.all([
        BlogReactionModel.deleteMany({ blogPostId }),
        BlogCommentModel.deleteMany({ blogPostId }),
    ]);
    await post.deleteOne();

    await Promise.all(
        getPostImages(post).map(async (imageUrl) => {
            try {
                await deleteImage(imageUrl);
            } catch (error) {
                console.error("Failed to delete blog image:", error);
            }
        })
    );
    return toBlogPostResponse(post);
};

export const toggleBlogLoveService = async (blogPostId: string, userId: string) => {
    await getBlogPostOrThrow(blogPostId);
    const existingReaction = await BlogReactionModel.findOne({
        blogPostId,
        userId,
        reactionType: "love",
    });

    if (existingReaction) {
        await existingReaction.deleteOne();
    } else {
        await BlogReactionModel.create({
            blogPostId,
            userId,
            reactionType: "love",
        });
    }

    const engagement = await getBlogEngagement(blogPostId, userId);
    return {
        loved: engagement.lovedByCurrentUser,
        loveCount: engagement.loveCount,
    };
};

export const getBlogLovesService = async (blogPostId: string, includeInactive = false) => {
    await getBlogPostOrThrow(blogPostId, includeInactive);
    const lovedUsers = await BlogReactionModel.find({
        blogPostId,
        reactionType: "love",
    })
        .sort({ createdAt: -1 })
        .populate(userPopulate)
        .lean();
    return {
        loveCount: lovedUsers.length,
        lovedUsers,
    };
};

export const createBlogCommentService = async (
    blogPostId: string,
    userId: string,
    comment: string
) => {
    await getBlogPostOrThrow(blogPostId);
    const result = await BlogCommentModel.create({ blogPostId, userId, comment });
    return BlogCommentModel.findById(result._id).populate(userPopulate);
};

export const getBlogCommentsService = async (
    blogPostId: string,
    includeInactive = false
) => {
    await getBlogPostOrThrow(blogPostId, includeInactive);
    return BlogCommentModel.find({ blogPostId })
        .sort({ createdAt: -1 })
        .populate(userPopulate)
        .lean();
};

export const deleteBlogCommentService = async (
    blogPostId: string,
    commentId: string,
    userId: string,
    actor?: { role?: string; permissions?: string[] }
) => {
    assertValidId(blogPostId);
    assertValidId(commentId, "comment ID");
    const comment = await BlogCommentModel.findOne({ _id: commentId, blogPostId });
    if (!comment) {
        throw new AppError(404, "Comment not found");
    }
    const isOwner = String(comment.userId) === userId;
    const canModerate =
        isFullAccessRole(actor?.role) ||
        hasPermission(
            getEffectivePermissions({
                role: actor?.role,
                permissions: actor?.permissions,
            }),
            PERMISSIONS.BLOGS_WRITE
        );

    if (!isOwner && !canModerate) {
        throw new AppError(403, "You are not authorized to delete this comment");
    }
    await comment.deleteOne();
    return comment;
};

export const blogPostService = {
    createBlogPostService,
    getAllBlogPostsService,
    getBlogPostByIdService,
    updateBlogPostService,
    deleteBlogPostService,
    toggleBlogLoveService,
    getBlogLovesService,
    createBlogCommentService,
    getBlogCommentsService,
    deleteBlogCommentService,
};
