import express from "express";
import { APP_ROLES, panelWrite } from "../../middlewares/panelAccess";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../rbac/permissions.constants";
import { upload } from "../../utils/multer";
import { MAX_PRODUCT_IMAGES } from "./product-images.util";
import { productController } from "./products.controller";
import { productValidation } from "./products.validation";

const router = express.Router();

router.post(
    "/",
    upload.fields([{ name: "images", maxCount: 10 }]),
    ...panelWrite(PERMISSIONS.PRODUCTS_WRITE),
    validateRequest(productValidation.createProductZodSchema),
    productController.createProductController
);

router.patch(
    "/:id",
    upload.fields([{ name: "images", maxCount: MAX_PRODUCT_IMAGES }]),
    ...panelWrite(PERMISSIONS.PRODUCTS_WRITE),
    validateRequest(productValidation.updateProductZodSchema),
    productController.updateProductController
);

router.delete(
    "/:id",
    ...panelWrite(PERMISSIONS.PRODUCTS_WRITE),
    productController.deleteProductController
);

router.get(
    "/tags/:tags",
    auth(...APP_ROLES),
    productController.getProductsByTagController
);

router.get(
    "/:id",
    auth(...APP_ROLES),
    productController.getProductByIdController
);

router.get(
    "/",
    auth(...APP_ROLES),
    productController.getAllProductsController
);

router.get(
    "/category/:categoryId",
    auth(...APP_ROLES),
    productController.getAllProductsByCategoryIdController
);

export const productRoutes = router;
