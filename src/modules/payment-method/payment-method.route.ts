import { Router } from "express";
import { USER_ROLE } from "../../constants/status.constants";
import auth from "../../middlewares/auth";
import { APP_ROLES, panelRead, panelWrite } from "../../middlewares/panelAccess";
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

/** Admin panel — all methods (active + inactive). */
paymentMethodRouter.get(
    "/admin/all",
    ...panelRead,
    paymentMethodController.getAllPaymentMethodsController
);

/** Customer — active methods only. */
paymentMethodRouter.get(
    "/",
    auth(USER_ROLE.USER),
    paymentMethodController.getActivePaymentMethodsController
);

/** By id: customer → active only; admin / super-admin / staff → any. */
paymentMethodRouter.get(
    "/:id",
    auth(...APP_ROLES),
    validateRequest(paymentMethodValidation.paymentMethodIdParamsSchema),
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
    validateRequest(paymentMethodValidation.paymentMethodIdParamsSchema),
    paymentMethodController.deletePaymentMethodController
);

export default paymentMethodRouter;
