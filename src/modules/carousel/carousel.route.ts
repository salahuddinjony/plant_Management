import express from "express";
import { APP_ROLES, panelWrite } from "../../middlewares/panelAccess";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../rbac/permissions.constants";
import { upload } from "../../utils/multer";
import { carouselController } from "./carousel.controller";
import { carouselValidation } from "./carousel.validation";

const router = express.Router();

router.post(
    "/",
    upload.single("image"),
    ...panelWrite(PERMISSIONS.CAROUSELS_WRITE),
    validateRequest(carouselValidation.createCarouselZodSchema),
    carouselController.createCarouselController
);

router.patch(
    "/:id",
    upload.single("image"),
    ...panelWrite(PERMISSIONS.CAROUSELS_WRITE),
    validateRequest(carouselValidation.updateCarouselZodSchema),
    carouselController.updateCarouselController
);

router.delete(
    "/:id",
    ...panelWrite(PERMISSIONS.CAROUSELS_WRITE),
    carouselController.deleteCarouselController
);

router.get(
    "/active",
    auth(...APP_ROLES),
    carouselController.getActiveCarouselsController
);

router.get(
    "/:id",
    auth(...APP_ROLES),
    carouselController.getCarouselByIdController
);

router.get(
    "/",
    auth(...APP_ROLES),
    carouselController.getAllCarouselsController
);

export const carouselRoutes = router;
