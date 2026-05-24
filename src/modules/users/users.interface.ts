import { USER_ROLE, USER_STATUS } from "../../constants/status.constants";
import { TStaffRoleSlug } from "../rbac/staff-role.constants";

export type TUserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];
export type TUserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export type TUser = {
  name: string;
  emailOrPhone: string;
  password: string;
  profilePicture?: string;
  avatarId?: string;
  role?: TUserRole;
  staffRole?: TStaffRoleSlug;
  permissions?: string[];
  invitedBy?: string;
  status?: TUserStatus;
  isDeleted?: boolean;
  passwordChangedAt?: Date;
  /** Set when staff chooses password (invite, change-password, or reset-password). */
  staffCredentialsEstablishedAt?: Date;
  accessToken?: string;
  refreshToken?: string;
};
