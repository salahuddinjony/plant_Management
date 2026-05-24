import { Request, Response } from "express";
import httpStatus from "http-status";
import { USER_ROLE } from "../../constants/status.constants";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { TPaymentMethod } from "./payment-method.interface";
import { paymentMethodService } from "./payment-method.service";

const createPaymentMethodController = catchAsync(async (req: Request, res: Response) => {
    const paymentMethodData = req.body as TPaymentMethod;
    const result = await paymentMethodService.createPaymentMethodService(paymentMethodData);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Payment method created successfully",
        data: result,
    });
});

const getPaymentMethodByIdController = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const role = req.user?.role as string | undefined;

    const result =
        role === USER_ROLE.USER
            ? await paymentMethodService.getPaymentMethodByIdActiveService(id)
            : await paymentMethodService.getPaymentMethodByIdService(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Payment method retrieved successfully",
        data: result,
    });
});

const getAllPaymentMethodsController = catchAsync(async (req: Request, res: Response) => {
    const result = await paymentMethodService.getAllPaymentMethodsService();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Payment methods retrieved successfully",
        data: result,
    });
});

const getActivePaymentMethodsController = catchAsync(async (req: Request, res: Response) => {
    const result = await paymentMethodService.getActivePaymentMethodsService();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Active payment methods retrieved successfully",
        data: result,
    });
});

const updatePaymentMethodController = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const updateData = req.body as Partial<TPaymentMethod>;
    const result = await paymentMethodService.updatePaymentMethodService(id as string, updateData);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Payment method updated successfully",
        data: result,
    });
});

const deletePaymentMethodController = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const result = await paymentMethodService.deletePaymentMethodService(id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Payment method deleted successfully",
        data: result,
    });
});

export const paymentMethodController = {
    createPaymentMethodController,
    getPaymentMethodByIdController,
    getAllPaymentMethodsController,
    getActivePaymentMethodsController,
    updatePaymentMethodController,
    deletePaymentMethodController,
};
