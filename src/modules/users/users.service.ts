import httpStatus from "http-status";
import QueryBuilder from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import { USER_ROLE, USER_STATUS } from "../../constants/status.constants";
import { UserModel } from "./users.model";

/**
 * Get Profile by user id
 * @param userId 
 * @param payload 
 * @returns 
 */
const getProfile = async (userId: string) => {
  console.log("Fetching profile for userId:", userId);
  const user = await UserModel.findById(userId)
    .select("id name emailOrPhone role status profilePicture avatarId")
    .populate("avatarId", "name imageUrl");
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  return user;
}

/**
 * update profile by user id
 * @param userId 
 * @param payload 
 * @returns 
 */
const updateProfile = async (userId: string, payload: any) => {
  const user = await UserModel.findByIdAndUpdate(userId, payload, { new: true });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  return user;
};

/**
 * Get all users (omits `status: deleted`; blocked/inactive/active still included).
 * @param query 
 * @param viewerRole - When `user`, only rows with role `user` are returned (staff excluded).
 * @returns List of users and meta data
 */
const getAllUsers = async (query: Record<string, unknown>, viewerRole?: string) => {
  const baseFilter: Record<string, unknown> = {
    status: { $ne: USER_STATUS.DELETED },
  };
  if (viewerRole === USER_ROLE.USER) {
    baseFilter.role = USER_ROLE.USER;
  }

  const userQuery = new QueryBuilder(
    UserModel.find(baseFilter)
      .select("id name profilePicture avatarId emailOrPhone role status isDeleted createdAt updatedAt")
      .populate("avatarId", "name imageUrl")
      .lean(),
    query
  )
    .search(["name", "emailOrPhone"])
    .filter()
    .sort()
    .paginate()
    .fields();
  const users = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();
  return { users: users || [], meta };
};

/**
 * Update user status by admin
 * Admin and Super Admin accounts cannot have their status changed via this API.
 * @param userId 
 * @param status 
 * @returns updated user
 */
const updateStatus = async (userId: string, status: string) => {
  const target = await UserModel.findById(userId).select("role");
  if (!target) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  if (target.role === USER_ROLE.ADMIN || target.role === USER_ROLE.SUPER_ADMIN) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Admin and Super Admin status cannot be updated."
    );
  }

  const user = await UserModel.findByIdAndUpdate(userId, { status }, { new: true });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  return user;
};

/**
 * Soft delete user (marks deleted, keeps document for history).
 * Admin and Super Admin accounts cannot be deleted.
 */
const deleteUser = async (userId: string) => {
  const target = await UserModel.findById(userId).select("role");
  if (!target) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  if (target.role === USER_ROLE.ADMIN || target.role === USER_ROLE.SUPER_ADMIN) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Admin and Super Admin accounts cannot be deleted."
    );
  }

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { status: USER_STATUS.DELETED, isDeleted: true },
    { new: true }
  ).select("id name emailOrPhone role status profilePicture avatarId");

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};


export const userService = {
  getProfile,
  updateProfile,
  getAllUsers,
  updateStatus,
  deleteUser,
};
