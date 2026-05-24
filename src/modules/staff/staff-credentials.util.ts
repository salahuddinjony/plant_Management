import mongoose from "mongoose";
import config from "../../config";
import AppError from "../../errors/AppError";
import status from "http-status";
import { hashPassword } from "../auth/auth.utils";
import { StaffInviteModel } from "./staff-invite.model";

export const STAFF_INVITE_ACCEPTED_VIA = {
    INVITE: "invite",
    ADMIN: "admin",
    SELF: "self",
} as const;

export type TStaffInviteAcceptedVia =
    (typeof STAFF_INVITE_ACCEPTED_VIA)[keyof typeof STAFF_INVITE_ACCEPTED_VIA];

export const staffHasEstablishedCredentials = (user: {
    staffCredentialsEstablishedAt?: Date | null;
}): boolean => Boolean(user.staffCredentialsEstablishedAt);

/**
 * Keep all staff_invite rows for this user aligned with the live user record
 * (pending and already-accepted), including active staff permission updates.
 */
export const syncStaffInviteRoleAndPermissions = async (
    userId: mongoose.Types.ObjectId | string,
    staffRole: string,
    permissions: string[]
) => {
    await StaffInviteModel.updateMany(
        { userId },
        { $set: { staffRole, permissions } }
    );
};

/** @deprecated Use syncStaffInviteRoleAndPermissions */
export const syncPendingStaffInviteRoleAndPermissions = syncStaffInviteRoleAndPermissions;

export const markUnusedInvitesConsumed = async (
    userId: mongoose.Types.ObjectId | string,
    acceptedVia: TStaffInviteAcceptedVia
) => {
    await StaffInviteModel.updateMany(
        { userId, isUsed: false },
        {
            $set: {
                isUsed: true,
                acceptedAt: new Date(),
                acceptedVia,
            },
        }
    );
};

/** Apply env default password when admin activates staff who never established credentials. */
export const applyStaffDefaultPasswordIfNeeded = async (user: {
    staffCredentialsEstablishedAt?: Date | null;
    password?: string;
}): Promise<boolean> => {
    if (staffHasEstablishedCredentials(user)) {
        return false;
    }

    const defaultPassword = config.staffDefaultPassword?.trim();
    if (!defaultPassword || defaultPassword.length < 6) {
        throw new AppError(
            status.BAD_REQUEST,
            "STAFF_DEFAULT_PASSWORD is not configured (min 6 characters). Cannot activate staff without invite onboarding."
        );
    }

    user.password = await hashPassword(defaultPassword);
    return true;
};
