import express from "express";
import { USER_ROLE } from "../../constants/status.constants";
import auth from "../../middlewares/auth";
import { APP_ROLES } from "../../middlewares/panelAccess";
import validateRequest from "../../middlewares/validateRequest";
import { upload } from "../../utils/multer";
import { carouselController } from "./carousel.controller";
import { carouselValidation } from "./carousel.validation";

const router = express.Router();

router.post(
    "/",
    upload.single("image"),
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateRequest(carouselValidation.createCarouselZodSchema),
    carouselController.createCarouselController
);

router.patch(
    "/:id",
    upload.single("image"),
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateRequest(carouselValidation.updateCarouselZodSchema),
    carouselController.updateCarouselController
);

router.delete(
    "/:id",
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
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
