import { Request, Response } from "express";
import httpStatus from "http-status";
import { USER_ROLE } from "../../constants/status.constants";
import { FOLDER_NAMES } from "../../constants/folder.constants";
import catchAsync from "../../utils/catchAsync";
import { uploadImage } from "../../utils/imageUpload";
import sendResponse from "../../utils/sendResponse";
import { blogPostService } from "./blog-post.service";

const currentUserId = (req: Request) => req.user?.id as string;
const canSeeInactive = (req: Request) => req.user?.role !== USER_ROLE.USER;

const createBlogPostController = catchAsync(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) {
        throw new Error("At least one image is required");
    }

    const uploadedImages = await Promise.all(
        files.map(async (file) => {
            const uploadResult = await uploadImage(file.buffer, FOLDER_NAMES.BLOG);
            return uploadResult.url;
        })
    );
    const result = await blogPostService.createBlogPostService({
        title: req.body.title,
        description: req.body.description,
        images: uploadedImages,
        image: uploadedImages[0],
        isActive: req.body.isActive,
    });

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Blog post created successfully",
        data: result,
    });
});

const getAllBlogPostsController = catchAsync(async (req: Request, res: Response) => {
    const result = await blogPostService.getAllBlogPostsService(req.query, false);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Blog posts retrieved successfully",
        data: result,
    });
});

const getAllBlogPostsForAdminController = catchAsync(async (req: Request, res: Response) => {
    const result = await blogPostService.getAllBlogPostsService(req.query, true);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Blog posts retrieved successfully",
        data: result,
    });
});

const getBlogPostByIdController = catchAsync(async (req: Request, res: Response) => {
    const result = await blogPostService.getBlogPostByIdService(
        req.params.blogPostId,
        currentUserId(req),
        canSeeInactive(req)
    );
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Blog post retrieved successfully",
        data: result,
    });
});

const updateBlogPostController = catchAsync(async (req: Request, res: Response) => {
    const result = await blogPostService.updateBlogPostService(req.params.blogPostId, {
        ...req.body,
        ...(req.files && { files: req.files as Express.Multer.File[] }),
    });
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Blog post updated successfully",
        data: result,
    });
});

const deleteBlogPostController = catchAsync(async (req: Request, res: Response) => {
    const result = await blogPostService.deleteBlogPostService(req.params.blogPostId);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Blog post deleted successfully",
        data: result,
    });
});

const toggleBlogLoveController = catchAsync(async (req: Request, res: Response) => {
    const result = await blogPostService.toggleBlogLoveService(
        req.params.blogPostId,
        currentUserId(req)
    );
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.loved ? "Blog post loved successfully" : "Blog post love removed",
        data: result,
    });
});

const getBlogLovesController = catchAsync(async (req: Request, res: Response) => {
    const result = await blogPostService.getBlogLovesService(
        req.params.blogPostId,
        canSeeInactive(req)
    );
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Blog post loves retrieved successfully",
        data: result,
    });
});

const createBlogCommentController = catchAsync(async (req: Request, res: Response) => {
    const result = await blogPostService.createBlogCommentService(
        req.params.blogPostId,
        currentUserId(req),
        req.body.comment
    );
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Comment added successfully",
        data: result,
    });
});

const getBlogCommentsController = catchAsync(async (req: Request, res: Response) => {
    const result = await blogPostService.getBlogCommentsService(
        req.params.blogPostId,
        canSeeInactive(req)
    );
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Blog comments retrieved successfully",
        data: result,
    });
});

const deleteBlogCommentController = catchAsync(async (req: Request, res: Response) => {
    const result = await blogPostService.deleteBlogCommentService(
        req.params.blogPostId,
        req.params.commentId,
        currentUserId(req),
        {
            role: req.user?.role,
            permissions: req.user?.permissions,
        }
    );
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Comment deleted successfully",
        data: result,
    });
});

export const blogPostController = {
    createBlogPostController,
    getAllBlogPostsController,
    getAllBlogPostsForAdminController,
    getBlogPostByIdController,
    updateBlogPostController,
    deleteBlogPostController,
    toggleBlogLoveController,
    getBlogLovesController,
    createBlogCommentController,
    getBlogCommentsController,
    deleteBlogCommentController,
};
