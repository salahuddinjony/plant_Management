import config from "../../config";

export const STAFF_INVITE_CODE_LENGTH = 6;

/** Invite link/code validity from STAFF_INVITE_EXPIRY_DAYS in .env (default 7). */
export const getStaffInviteExpiryMs = (): number =>
    config.staffInviteExpiryDays * 24 * 60 * 60 * 1000;
