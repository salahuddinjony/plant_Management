import { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import {
    PURCHASE_DISCLAIMER_TYPES,
    TPurchaseDisclaimerType,
} from "./purchase-disclaimer.constants";
import {
    createPurchaseDisclaimerService,
    deletePurchaseDisclaimerService,
    getActivePurchaseDisclaimersService,
    getAllPurchaseDisclaimersAdminService,
    getPurchaseDisclaimerByIdService,
    reorderAllPurchaseDisclaimersService,
    updatePurchaseDisclaimerService,
} from "./purchase-disclaimer.service";

export const getActivePurchaseDisclaimers = catchAsync(async (req: Request, res: Response) => {
    const rawType = req.query.type;
    let type: TPurchaseDisclaimerType | undefined;
    if (typeof rawType === "string" && rawType.length > 0) {
        if (!(PURCHASE_DISCLAIMER_TYPES as readonly string[]).includes(rawType)) {
            throw new AppError(
                httpStatus.BAD_REQUEST,
                `Invalid type. Allowed: ${PURCHASE_DISCLAIMER_TYPES.join(", ")}`
            );
        }
        type = rawType as TPurchaseDisclaimerType;
    }
    const data = await getActivePurchaseDisclaimersService(type);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Active purchase disclaimers retrieved",
        data,
    });
});

export const getAllPurchaseDisclaimersAdmin = catchAsync(async (_req: Request, res: Response) => {
    const data = await getAllPurchaseDisclaimersAdminService();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Purchase disclaimers retrieved",
        data,
    });
});

export const getPurchaseDisclaimerById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = await getPurchaseDisclaimerByIdService(id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Purchase disclaimer retrieved",
        data,
    });
});

export const createPurchaseDisclaimer = catchAsync(async (req: Request, res: Response) => {
    const data = await createPurchaseDisclaimerService(req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Purchase disclaimer created",
        data,
    });
});

export const updatePurchaseDisclaimer = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = await updatePurchaseDisclaimerService(id as string, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Purchase disclaimer updated",
        data,
    });
});

export const reorderAllPurchaseDisclaimers = catchAsync(async (req: Request, res: Response) => {
    const { orderedIds } = req.body as { orderedIds: string[] };
    const data = await reorderAllPurchaseDisclaimersService(orderedIds);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Purchase disclaimers reordered",
        data,
    });
});

export const deletePurchaseDisclaimer = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = await deletePurchaseDisclaimerService(id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Purchase disclaimer deleted",
        data,
    });
});

export const purchaseDisclaimerController = {
    getActivePurchaseDisclaimers,
    getAllPurchaseDisclaimersAdmin,
    getPurchaseDisclaimerById,
    createPurchaseDisclaimer,
    updatePurchaseDisclaimer,
    reorderAllPurchaseDisclaimers,
    deletePurchaseDisclaimer,
};
