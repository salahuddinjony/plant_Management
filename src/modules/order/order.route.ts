import { Router } from "express";
import { USER_ROLE } from "../../constants/status.constants";
import auth from "../../middlewares/auth";
import { APP_ROLES, panelGuard, panelRead, panelWrite } from "../../middlewares/panelAccess";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../rbac/permissions.constants";
import { orderController } from "./order.controller";
import { orderValidation } from "./order.validation";

const orderRouter = Router();

/**
 * Buy now — single product, no cart required
 */
orderRouter.post(
    "/buy-now",
    auth(USER_ROLE.USER, USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateRequest(orderValidation.buyNowOrderZodSchema),
    orderController.buyNowOrder
);

/**
 * Create order from cart (By User)
 */
orderRouter.post(
    "/",
    auth(USER_ROLE.USER, USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateRequest(orderValidation.createOrderZodSchema),
    orderController.createOrder
);

/**
 * Get user orders (By User)
 */
orderRouter.get("/my", auth(USER_ROLE.USER, USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN), orderController.getOrders);

/**
 * Get all orders (By Admin)
 */
orderRouter.get(
    "/all",
    ...panelGuard(PERMISSIONS.READ_ALL, PERMISSIONS.ORDERS_READ),
    orderController.getAllOrders
);

/**
 * Get specific order (By User and Admin)
 */
orderRouter.get("/:orderId", auth(...APP_ROLES), orderController.getOrder);

/**
 * Update order status (By Admin)
 */
orderRouter.patch(
    "/:orderId/status",
    ...panelWrite(PERMISSIONS.ORDERS_UPDATE_STATUS),
    validateRequest(orderValidation.updateOrderStatusValidationSchema),
    orderController.updateOrderStatus
);

/**
 * Update order payment status (By Admin)
 */
orderRouter.patch(
    "/:orderId/payment-status",
    ...panelWrite(PERMISSIONS.ORDERS_UPDATE_PAYMENT),
    validateRequest(orderValidation.updateOrderPaymentStatusValidationSchema),
    orderController.updateOrderPaymentStatus
);

/**
 * Cancel order (By User) - Within 6 hours of creation
 */
orderRouter.patch("/:orderId/cancel", auth(USER_ROLE.USER, USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    orderController.cancelOrder);

export default orderRouter;
