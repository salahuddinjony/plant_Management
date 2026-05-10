import httpStatus from "http-status";
import QueryBuilder from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import { USER_STATUS } from "../../constants/status.constants";
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
 * Get all users with by admin
 * @param query 
 * @returns List of users and meta data
 */
const getAllUsers = async (query: Record<string, unknown>) => {
  const userQuery = new QueryBuilder(
    UserModel.find({
      isDeleted: { $ne: true },
      status: { $nin: [USER_STATUS.DELETED] },
    })
      .select("id name profilePicture avatarId emailOrPhone role status createdAt updatedAt")
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
 * @param userId 
 * @param status 
 * @returns updated user
 */
const updateStatus = async (userId: string, status: string) => {
  const user = await UserModel.findByIdAndUpdate(userId, { status }, { new: true });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  return user;
};

/**
 * Soft delete user (marks deleted, keeps document for history).
 */
const deleteUser = async (userId: string) => {
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
