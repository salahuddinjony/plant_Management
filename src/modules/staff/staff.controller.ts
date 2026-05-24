import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import {
    acceptStaffInviteService,
    blockStaffService,
    deleteStaffService,
    inviteStaffService,
    listStaffService,
    resendStaffInviteService,
    updateStaffPermissionsService,
    updateStaffStatusService,
} from "./staff.service";

export const inviteStaff = catchAsync(async (req: Request, res: Response) => {
    const result = await inviteStaffService(req.user.id as string, req.body);

    sendResponse(res, {
        statusCode: status.CREATED,
        success: true,
        message: result.message,
        data: result,
    });
});

export const acceptStaffInvite = catchAsync(async (req: Request, res: Response) => {
    const { token, password } = req.body;
    const result = await acceptStaffInviteService(token, password);

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

export const listStaff = catchAsync(async (req: Request, res: Response) => {
    const staff = await listStaffService();

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: "Staff list retrieved",
        data: staff,
    });
});

export const updateStaff = catchAsync(async (req: Request, res: Response) => {
    const { staffUserId } = req.params;
    const result = await updateStaffPermissionsService(
        req.user.id as string,
        staffUserId as string,
        req.body
    );

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: "Staff updated successfully",
        data: result,
    });
});

export const resendStaffInvite = catchAsync(async (req: Request, res: Response) => {
    const { staffUserId } = req.params;
    const result = await resendStaffInviteService(
        req.user.id as string,
        staffUserId as string
    );

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

export const blockStaff = catchAsync(async (req: Request, res: Response) => {
    const { staffUserId } = req.params;
    const result = await blockStaffService(req.user.id as string, staffUserId as string);

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

export const updateStaffStatus = catchAsync(async (req: Request, res: Response) => {
    const { staffUserId } = req.params;
    const { status: nextStatus } = req.body;
    const result = await updateStaffStatusService(
        req.user.id as string,
        staffUserId as string,
        nextStatus
    );

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

export const deleteStaff = catchAsync(async (req: Request, res: Response) => {
    const { staffUserId } = req.params;
    const result = await deleteStaffService(req.user.id as string, staffUserId as string);

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

export const staffController = {
    inviteStaff,
    acceptStaffInvite,
    listStaff,
    resendStaffInvite,
    updateStaff,
    blockStaff,
    updateStaffStatus,
    deleteStaff,
};
