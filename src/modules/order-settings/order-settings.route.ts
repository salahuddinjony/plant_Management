import { Router } from "express";
import { USER_ROLE } from "../../constants/status.constants";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { orderSettingsController } from "./order-settings.controller";
import { orderSettingsValidation } from "./order-settings.validation";

const orderSettingsRouter = Router();

/** Active pricing (checkout preview) — must be before /:id */
orderSettingsRouter.get(
    "/active",
    auth(USER_ROLE.USER, USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    orderSettingsController.getActiveOrderSettingsController
);

orderSettingsRouter.get(
    "/",
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    orderSettingsController.getAllOrderSettingsController
);

orderSettingsRouter.get(
    "/:id",
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    orderSettingsController.getOrderSettingsByIdController
);

orderSettingsRouter.post(
    "/",
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateRequest(orderSettingsValidation.createOrderSettingsZodSchema),
    orderSettingsController.createOrderSettingsController
);

orderSettingsRouter.patch(
    "/:id/activate",
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    orderSettingsController.activateOrderSettingsController
);

orderSettingsRouter.patch(
    "/:id",
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateRequest(orderSettingsValidation.updateOrderSettingsZodSchema),
    orderSettingsController.updateOrderSettingsController
);

orderSettingsRouter.delete(
    "/:id",
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    orderSettingsController.deleteOrderSettingsController
);

export default orderSettingsRouter;
