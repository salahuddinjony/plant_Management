import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { USER_ROLE, USER_STATUS } from "../../constants/status.constants";
import {
    applyStaffDefaultPasswordIfNeeded,
    markUnusedInvitesConsumed,
    STAFF_INVITE_ACCEPTED_VIA,
} from "../staff/staff-credentials.util";
import { UserModel } from "./users.model";

const clearsSessionOnStatus = (nextStatus: string) =>
    nextStatus === USER_STATUS.BLOCKED ||
    nextStatus === USER_STATUS.INACTIVE ||
    nextStatus === USER_STATUS.DELETED;

/**
 * Central status transitions for customers and staff (admin panel update-status).
 */
export const setUserStatus = async (userId: string, nextStatus: string) => {
    const user = await UserModel.findById(userId).select(
        "+password role status staffCredentialsEstablishedAt accessToken refreshToken"
    );

    if (!user) {
        throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }

    if (user.role === USER_ROLE.ADMIN || user.role === USER_ROLE.SUPER_ADMIN) {
        throw new AppError(
            httpStatus.FORBIDDEN,
            "Admin and Super Admin status cannot be updated."
        );
    }

    const previousStatus = user.status;

    if (previousStatus === nextStatus) {
        return user;
    }

    if (user.role === USER_ROLE.STAFF) {
        if (
            nextStatus === USER_STATUS.ACTIVE &&
            previousStatus !== USER_STATUS.ACTIVE
        ) {
            const appliedDefault = await applyStaffDefaultPasswordIfNeeded(user);
            if (appliedDefault) {
                await markUnusedInvitesConsumed(user._id, STAFF_INVITE_ACCEPTED_VIA.ADMIN);
            }
        }
    }

    user.status = nextStatus as typeof user.status;

    if (clearsSessionOnStatus(nextStatus)) {
        user.accessToken = undefined;
        user.refreshToken = undefined;
    }

    await user.save();
    return user;
};
