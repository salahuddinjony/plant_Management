import { Router } from "express";
import { APP_ROLES, panelRead, panelWrite } from "../../middlewares/panelAccess";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../rbac/permissions.constants";
import { orderSettingsController } from "./order-settings.controller";
import { orderSettingsValidation } from "./order-settings.validation";

const orderSettingsRouter = Router();

orderSettingsRouter.get(
    "/active",
    auth(...APP_ROLES),
    orderSettingsController.getActiveOrderSettingsController
);

orderSettingsRouter.get("/", ...panelRead, orderSettingsController.getAllOrderSettingsController);

orderSettingsRouter.get(
    "/:id",
    ...panelRead,
    orderSettingsController.getOrderSettingsByIdController
);

orderSettingsRouter.post(
    "/",
    ...panelWrite(PERMISSIONS.ORDER_SETTINGS_WRITE),
    validateRequest(orderSettingsValidation.createOrderSettingsZodSchema),
    orderSettingsController.createOrderSettingsController
);

orderSettingsRouter.patch(
    "/:id/activate",
    ...panelWrite(PERMISSIONS.ORDER_SETTINGS_WRITE),
    orderSettingsController.activateOrderSettingsController
);

orderSettingsRouter.patch(
    "/:id",
    ...panelWrite(PERMISSIONS.ORDER_SETTINGS_WRITE),
    validateRequest(orderSettingsValidation.updateOrderSettingsZodSchema),
    orderSettingsController.updateOrderSettingsController
);

orderSettingsRouter.delete(
    "/:id",
    ...panelWrite(PERMISSIONS.ORDER_SETTINGS_WRITE),
    orderSettingsController.deleteOrderSettingsController
);

export default orderSettingsRouter;
