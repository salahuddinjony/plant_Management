import express from "express";
import { USER_ROLE } from "../../constants/status.constants";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { upload } from "../../utils/multer";
import { productController } from "./products.controller";
import { productValidation } from "./products.validation";

const router = express.Router();

/**
 * Create a new product
 * @param req - The request object
 * @param res - The response object
 */
router.post(
    "/",
    upload.fields([{ name: "images", maxCount: 10 }]),
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateRequest(productValidation.createProductZodSchema),
    productController.createProductController
);

/**
 * Update a product by ID
 * @param req - The request object
 * @param res - The response object
 */
router.patch(
    "/:id",
    upload.fields([{ name: "images", maxCount: 10 }]),
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateRequest(productValidation.updateProductZodSchema),
    productController.updateProductController
);

/**
 * Delete a product by ID
 * @param req - The request object
 * @param res - The response object
 */
router.delete(
    "/:id",
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    productController.deleteProductController
);

/**
 * Get products by tag name
 * @param req - The request object
 * @param res - The response object
 */
router.get(
    "/tags/:tags",
    auth(USER_ROLE.USER, USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    productController.getProductsByTagController
);

/**
 * Get a product by ID
 * @param req - The request object
 * @param res - The response object
 */
router.get(
    "/:id",
    auth(USER_ROLE.USER, USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    productController.getProductByIdController
);

/**
 * Get all products
 * @param req - The request object
 * @param res - The response object
 */
router.get(
    "/",
    auth(USER_ROLE.USER, USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    productController.getAllProductsController
);

/**
 * Get all products by category id
 * @param req - The request object
 * @param res - The response object
 */
router.get(
    "/category/:categoryId",
    auth(USER_ROLE.USER, USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    productController.getAllProductsByCategoryIdController
);

export const productRoutes = router;
