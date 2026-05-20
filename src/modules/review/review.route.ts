import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { upload } from "../../utils/multer";
import { reviewController } from "./review.controller";
import { reviewValidation } from "./review.validation";

const reviewRouter = Router();

/**
 * @route POST /reviews
 * Create review (multipart optional for images)
 */
reviewRouter.post(
    "/",
    auth(),
    upload.array("images", 10),
    validateRequest(reviewValidation.createReviewZodSchema),
    reviewController.createReviewController
);

/**
 * @route PATCH /reviews/update/:reviewId
 */
reviewRouter.patch(
    "/update/:reviewId",
    auth(),
    upload.array("images", 10),
    validateRequest(reviewValidation.updateReviewZodSchema),
    reviewController.updateReviewController
);

/**
 * @route GET /reviews/product/:productId
 */
reviewRouter.get("/product/:productId", reviewController.getReviewsByProductController);

/**
 * @route GET /reviews/my
 */
reviewRouter.get("/my", auth(), reviewController.getReviewsByUserController);

/** Legacy: publish / unpublish / helpful (production compatibility) */
reviewRouter.patch("/:reviewId/publish", auth(), reviewController.publishReviewController);
reviewRouter.patch("/:reviewId/unpublish", auth(), reviewController.unpublishReviewController);
reviewRouter.patch("/:reviewId/helpful", reviewController.addHelpfulReviewController);

/**
 * @route DELETE /reviews/:reviewId
 */
reviewRouter.delete("/:reviewId", auth(), reviewController.deleteReviewController);

export default reviewRouter;
