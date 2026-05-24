import { Router } from "express";
import { panelRead, panelWrite } from "../../middlewares/panelAccess";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../rbac/permissions.constants";
import { paymentMethodController } from "./payment-method.controller";
import { paymentMethodValidation } from "./payment-method.validation";

const paymentMethodRouter = Router();

paymentMethodRouter.post(
    "/",
    ...panelWrite(PERMISSIONS.PAYMENT_METHODS_WRITE),
    validateRequest(paymentMethodValidation.createPaymentMethodZodSchema),
    paymentMethodController.createPaymentMethodController
);

paymentMethodRouter.get(
    "/admin/all",
    ...panelRead,
    paymentMethodController.getAllPaymentMethodsController
);

paymentMethodRouter.get(
    "/",
    paymentMethodController.getActivePaymentMethodsController
);

paymentMethodRouter.get(
    "/:id",
    ...panelRead,
    paymentMethodController.getPaymentMethodByIdController
);

paymentMethodRouter.patch(
    "/:id",
    ...panelWrite(PERMISSIONS.PAYMENT_METHODS_WRITE),
    validateRequest(paymentMethodValidation.updatePaymentMethodZodSchema),
    paymentMethodController.updatePaymentMethodController
);

paymentMethodRouter.delete(
    "/:id",
    ...panelWrite(PERMISSIONS.PAYMENT_METHODS_WRITE),
    paymentMethodController.deletePaymentMethodController
);

export default paymentMethodRouter;
