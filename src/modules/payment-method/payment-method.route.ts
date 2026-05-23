import { Router } from "express";
import { USER_ROLE } from "../../constants/status.constants";
import auth from "../../middlewares/auth";
import { panelRead } from "../../middlewares/panelAccess";
import validateRequest from "../../middlewares/validateRequest";
import { paymentMethodController } from "./payment-method.controller";
import { paymentMethodValidation } from "./payment-method.validation";

const paymentMethodRouter = Router();

/**
 * Create payment method (Admin only)
 */
paymentMethodRouter.post(
    "/",
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateRequest(paymentMethodValidation.createPaymentMethodZodSchema),
    paymentMethodController.createPaymentMethodController
);

/**
 * Get all payment methods (Admin only)
 */
paymentMethodRouter.get(
    "/admin/all",
    ...panelRead,
    paymentMethodController.getAllPaymentMethodsController
);

/**
 * Get active payment methods for checkout (Public/User)
 */
paymentMethodRouter.get(
    "/",
    paymentMethodController.getActivePaymentMethodsController
);

/**
 * Get specific payment method (Admin only)
 */
paymentMethodRouter.get(
    "/:id",
    ...panelRead,
    paymentMethodController.getPaymentMethodByIdController
);

/**
 * Update payment method (Admin only)
 */
paymentMethodRouter.patch(
    "/:id",
    auth(USER_ROLE.ADMIN),
    validateRequest(paymentMethodValidation.updatePaymentMethodZodSchema),
    paymentMethodController.updatePaymentMethodController
);

/**
 * Delete payment method (Admin only)
 */
paymentMethodRouter.delete(
    "/:id",
    auth(USER_ROLE.ADMIN),
    paymentMethodController.deletePaymentMethodController
);

export default paymentMethodRouter;
