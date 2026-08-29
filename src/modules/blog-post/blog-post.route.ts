import { Router } from "express";
import { USER_ROLE } from "../../constants/status.constants";
import { APP_ROLES, panelRead, panelWrite } from "../../middlewares/panelAccess";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { upload } from "../../utils/multer";
import { PERMISSIONS } from "../rbac/permissions.constants";
import { blogPostController } from "./blog-post.controller";
import { blogPostValidation } from "./blog-post.validation";

const blogPostRouter = Router();

/** Admin post management. */
blogPostRouter.post(
    "/",
    upload.array("images", 10),
    ...panelWrite(PERMISSIONS.BLOGS_WRITE),
    validateRequest(blogPostValidation.createBlogPostZodSchema),
    blogPostController.createBlogPostController
);

blogPostRouter.patch(
    "/:blogPostId",
    upload.array("images", 10),
    ...panelWrite(PERMISSIONS.BLOGS_WRITE),
    validateRequest(blogPostValidation.updateBlogPostZodSchema),
    blogPostController.updateBlogPostController
);

blogPostRouter.delete(
    "/:blogPostId",
    ...panelWrite(PERMISSIONS.BLOGS_WRITE),
    blogPostController.deleteBlogPostController
);

/** Admin sees active and inactive posts. */
blogPostRouter.get(
    "/admin/all",
    ...panelRead,
    blogPostController.getAllBlogPostsForAdminController
);

/** Authenticated app users see active posts and engagement details. */
blogPostRouter.get(
    "/",
    auth(...APP_ROLES),
    blogPostController.getAllBlogPostsController
);

blogPostRouter.get(
    "/:blogPostId/loves",
    auth(...APP_ROLES),
    blogPostController.getBlogLovesController
);

blogPostRouter.post(
    "/:blogPostId/love",
    auth(USER_ROLE.USER),
    blogPostController.toggleBlogLoveController
);

blogPostRouter.get(
    "/:blogPostId/comments",
    auth(...APP_ROLES),
    blogPostController.getBlogCommentsController
);

blogPostRouter.post(
    "/:blogPostId/comments",
    auth(USER_ROLE.USER),
    validateRequest(blogPostValidation.createBlogCommentZodSchema),
    blogPostController.createBlogCommentController
);

blogPostRouter.delete(
    "/:blogPostId/comments/:commentId",
    auth(...APP_ROLES),
    blogPostController.deleteBlogCommentController
);

blogPostRouter.get(
    "/:blogPostId",
    auth(...APP_ROLES),
    blogPostController.getBlogPostByIdController
);

export default blogPostRouter;
