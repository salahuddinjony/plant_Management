import { Router } from "express";
import { USER_ROLE } from "../../constants/status.constants";
import auth from "../../middlewares/auth";
import { APP_ROLES, panelGuard, panelWrite } from "../../middlewares/panelAccess";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../rbac/permissions.constants";
import { transactionController } from "./transaction.controller";
import { transactionValidation } from "./transaction.validation";

const transactionRouter = Router();

/**
 * Create transaction (By User - during checkout)
 */
transactionRouter.post(
    "/",
    auth(USER_ROLE.USER, USER_ROLE.ADMIN),
    validateRequest(transactionValidation.createTransactionZodSchema),
    transactionController.createTransactionController
);

/**
 * Get my transaction history
 */
transactionRouter.get(
    "/history/my",
    auth(...APP_ROLES),
    transactionController.getMyTransactionHistoryController
);

/**
 * Get all transaction history (By Admin)
 */
transactionRouter.get(
    "/history/all",
    ...panelGuard(PERMISSIONS.READ_ALL, PERMISSIONS.TRANSACTIONS_READ),
    transactionController.getAllTransactionHistoryController
);

/**
 * Get transaction by order ID (By User and Admin)
 */
transactionRouter.get(
    "/order/:orderId",
    auth(...APP_ROLES),
    transactionController.getTransactionByOrderIdController
);

/**
 * Get specific transaction (By Admin)
 */
transactionRouter.get(
    "/:id",
    auth(...APP_ROLES),
    transactionController.getTransactionByIdController
);

/**
 * Update transaction status (By Admin only)
 */
transactionRouter.patch(
    "/:id/status",
    ...panelWrite(PERMISSIONS.TRANSACTIONS_WRITE),
    validateRequest(transactionValidation.updateTransactionStatusZodSchema),
    transactionController.updateTransactionStatusController
);

export default transactionRouter;
