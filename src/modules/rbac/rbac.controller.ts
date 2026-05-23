import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ALL_PERMISSION_VALUES, PERMISSIONS } from "./permissions.constants";
import { STAFF_ROLE_TEMPLATES } from "./role-templates";

const PERMISSION_LABELS: Record<string, string> = {
    [PERMISSIONS.ALL]: "Full access",
    [PERMISSIONS.READ_ALL]: "Read all modules",
    [PERMISSIONS.ORDERS_READ]: "View orders",
    [PERMISSIONS.ORDERS_WRITE]: "Manage orders",
    [PERMISSIONS.ORDERS_UPDATE_STATUS]: "Update order status",
    [PERMISSIONS.ORDERS_UPDATE_PAYMENT]: "Update payment status",
    [PERMISSIONS.PRODUCTS_WRITE]: "Manage products",
    [PERMISSIONS.CATEGORIES_WRITE]: "Manage categories",
    [PERMISSIONS.FLASH_SALES_WRITE]: "Manage flash sales",
    [PERMISSIONS.CAROUSELS_WRITE]: "Manage carousels",
    [PERMISSIONS.CONTACTS_WRITE]: "Manage contacts",
    [PERMISSIONS.AVATARS_WRITE]: "Manage avatars",
    [PERMISSIONS.ORDER_SETTINGS_WRITE]: "Order & delivery settings",
    [PERMISSIONS.PAYMENT_METHODS_WRITE]: "Payment methods",
    [PERMISSIONS.TRANSACTIONS_READ]: "View transactions",
    [PERMISSIONS.TRANSACTIONS_WRITE]: "Manage transactions",
    [PERMISSIONS.COUPONS_WRITE]: "Manage coupons",
    [PERMISSIONS.USERS_READ]: "View customers",
    [PERMISSIONS.REVIEWS_WRITE]: "Moderate reviews",
    [PERMISSIONS.STAFF_INVITE]: "Invite staff",
    [PERMISSIONS.STAFF_MANAGE]: "Manage staff",
};

export const listPermissions = catchAsync(async (_req: Request, res: Response) => {
    const permissions = ALL_PERMISSION_VALUES.filter((p) => p !== PERMISSIONS.ALL).map(
        (id) => ({
            id,
            label: PERMISSION_LABELS[id] ?? id,
        })
    );

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: "Permissions retrieved",
        data: permissions,
    });
});

export const listRoleTemplates = catchAsync(async (_req: Request, res: Response) => {
    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: "Role templates retrieved",
        data: STAFF_ROLE_TEMPLATES,
    });
});

export const rbacController = {
    listPermissions,
    listRoleTemplates,
};
