import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import { uploadImage } from "../../utils/imageUpload";
import sendResponse from "../../utils/sendResponse";
import { userService } from "./users.service";

/**
 * Controller to get user profile.
 * @param req - The request object containing user ID.
 * @param res - The response object to send the result.
 */
const getProfile = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.user;
  const result = await userService.getProfile(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User profile fetched successfully",
    data: result,
  });
});

/**
 * Controller to update user profile.
 * @param req - The request object containing user ID and profile data.
 * @param res - The response object to send the result.
 */
const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.user;
  const body = req.body;
  delete body.role;

  // Handle profile picture upload
  if (req.file) {
    const { url } = await uploadImage(req.file.buffer, "profile-pictures");
    body.profilePicture = url;
    // If uploading a new image, clear avatarId
    body.avatarId = null;
  } else if (body.avatarId) {
    // If selecting an avatar, clear profilePicture
    body.profilePicture = null;
  }

  const result = await userService.updateProfile(id, body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

/// Get all users list

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getAllUsers(req.query, req.user?.role);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users list fetched successfully",
    data: result.users,
    meta: result.meta,
  });
});

/// Update user status
const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { status } = req.body;
  console.log(`endpoint hit: /users/update-status/${userId}\n body: ${status}`)
  const result = await userService.updateStatus(userId as string, status);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User status updated successfully",
    data: result,
  });
});

/// Delete user (soft delete)
const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;

  // Allow normal users to delete only themselves; admins can delete anyone.
  if (req.user?.role === "user" && req.user?.id !== userId) {
    return sendResponse(res, {
      statusCode: httpStatus.FORBIDDEN,
      success: false,
      message: "You are not authorized to delete this user",
      data: null,
    });
  }

  const result = await userService.deleteUser(userId as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User deleted successfully",
    data: result,
  });
});

export const userController = {
  updateProfile,
  getAllUsers,
  updateStatus,
  getProfile,
  deleteUser,
};