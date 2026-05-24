import express from "express";
import { panelWrite } from "../../middlewares/panelAccess";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../rbac/permissions.constants";
import { upload } from "../../utils/multer";
import { categoryController } from "./category.controller";
import { categoryValidation } from "./category.validation";

const router = express.Router();

router.post(
    "/",
    upload.single("image"),
    ...panelWrite(PERMISSIONS.CATEGORIES_WRITE),
    validateRequest(categoryValidation.createCategoryZodSchema),
    categoryController.createCategoryController
);

router.patch(
    "/:id",
    upload.single("image"),
    ...panelWrite(PERMISSIONS.CATEGORIES_WRITE),
    validateRequest(categoryValidation.updateCategoryZodSchema),
    categoryController.updateCategoryController
);

router.delete(
    "/:id",
    ...panelWrite(PERMISSIONS.CATEGORIES_WRITE),
    categoryController.deleteCategoryController
);

router.get("/:id", categoryController.getCategoryByIdController);

router.get("/", categoryController.getAllCategoriesController);

export const categoryRoutes = router;
