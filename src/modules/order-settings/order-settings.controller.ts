import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { orderSettingsService } from "./order-settings.service";

const createOrderSettingsController = catchAsync(async (req: Request, res: Response) => {
    const result = await orderSettingsService.createOrderSettingsService(req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Order settings created successfully",
        data: result,
    });
});

const getActiveOrderSettingsController = catchAsync(async (req: Request, res: Response) => {
    const result = await orderSettingsService.getActiveOrderSettingsService();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Active order settings retrieved successfully",
        data: result,
    });
});

const getAllOrderSettingsController = catchAsync(async (req: Request, res: Response) => {
    const result = await orderSettingsService.getAllOrderSettingsService();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Order settings retrieved successfully",
        data: result,
    });
});

const getOrderSettingsByIdController = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const result = await orderSettingsService.getOrderSettingsByIdService(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Order settings retrieved successfully",
        data: result,
    });
});

const updateOrderSettingsController = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const result = await orderSettingsService.updateOrderSettingsService(id, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Order settings updated successfully",
        data: result,
    });
});

const activateOrderSettingsController = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const result = await orderSettingsService.activateOrderSettingsService(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Order settings activated successfully",
        data: result,
    });
});

const deleteOrderSettingsController = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const result = await orderSettingsService.deleteOrderSettingsService(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Order settings deleted successfully",
        data: result,
    });
});

export const orderSettingsController = {
    createOrderSettingsController,
    getActiveOrderSettingsController,
    getAllOrderSettingsController,
    getOrderSettingsByIdController,
    updateOrderSettingsController,
    activateOrderSettingsController,
    deleteOrderSettingsController,
};
