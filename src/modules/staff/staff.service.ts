import status from "http-status";
import { USER_ROLE, USER_STATUS } from "../../constants/status.constants";
import AppError from "../../errors/AppError";
import {
    getIdentifierChannel,
    normalizeIdentifier,
} from "../../utils/identifierChannel.util";
import { hashPassword } from "../auth/auth.utils";
import { PERMISSIONS } from "../rbac/permissions.constants";
import {
    getEffectivePermissions,
    hasPermission,
    isFullAccessRole,
} from "../rbac/rbac.utils";
import { getStaffRoleTemplate, resolveStaffPermissions } from "../rbac/role-templates";
import { isStaffRoleSlug, TStaffRoleSlug } from "../rbac/staff-role.constants";
import { UserModel } from "../users/users.model";
import { getStaffInviteExpiryMs } from "./staff-invite.constants";
import { StaffInviteModel } from "./staff-invite.model";
import { sendStaffInviteNotification } from "./staff-invite-notification.util";
import {
    generateInviteCode,
    generateInviteToken,
    hashInviteSecret,
} from "./staff-invite.util";
import {
    markUnusedInvitesConsumed,
    STAFF_INVITE_ACCEPTED_VIA,
    syncStaffInviteRoleAndPermissions,
} from "./staff-credentials.util";
import { setUserStatus } from "../users/user-status.service";

const assertInviterCanInvite = (inviter: {
    role?: string;
    permissions?: string[];
}) => {
    const perms = getEffectivePermissions(inviter);
    if (!hasPermission(perms, PERMISSIONS.STAFF_INVITE) && !perms.includes(PERMISSIONS.ALL)) {
        throw new AppError(status.FORBIDDEN, "You do not have permission to invite staff");
    }
};

const assertInviterCanGrant = (
    inviter: { role?: string; permissions?: string[] },
    toGrant: string[]
) => {
    const inviterPerms = getEffectivePermissions(inviter);
    if (inviterPerms.includes(PERMISSIONS.ALL)) {
        return;
    }
    const missing = toGrant.filter((p) => !hasPermission(inviterPerms, p));
    if (missing.length > 0) {
        throw new AppError(
            status.FORBIDDEN,
            `You cannot grant: ${missing.join(", ")}`
        );
    }
};

/** Send email/SMS first — if this throws, nothing is written to the database. */
const deliverStaffInviteNotification = async ({
    name,
    emailOrPhone,
    staffRole,
}: {
    name: string;
    emailOrPhone: string;
    staffRole: TStaffRoleSlug;
}) => {
    const plainToken = generateInviteToken();
    const inviteCode = generateInviteCode();
    const channel = getIdentifierChannel(emailOrPhone);

    await sendStaffInviteNotification({
        name,
        emailOrPhone,
        channel,
        staffRole,
        plainToken,
        inviteCode,
    });

    return { plainToken, inviteCode, channel };
};

const persistStaffInviteRecord = async ({
    inviterId,
    userId,
    name,
    emailOrPhone,
    staffRole,
    permissions,
    plainToken,
    inviteCode,
    channel,
}: {
    inviterId: unknown;
    userId: unknown;
    name: string;
    emailOrPhone: string;
    staffRole: TStaffRoleSlug;
    permissions: string[];
    plainToken: string;
    inviteCode: string;
    channel: "email" | "sms";
}) => {
    const expiryMs = getStaffInviteExpiryMs();
    const expiresAt = new Date(Date.now() + expiryMs);

    await StaffInviteModel.deleteMany({
        $or: [{ emailOrPhone }, { userId }],
    });

    await StaffInviteModel.create({
        name,
        emailOrPhone,
        channel,
        staffRole,
        permissions,
        inviteTokenHash: hashInviteSecret(plainToken),
        inviteCodeHash: hashInviteSecret(inviteCode),
        expiresAt,
        invitedBy: inviterId,
        isUsed: false,
        userId,
    });

    return Math.round(expiryMs / (24 * 60 * 60 * 1000));
};

export const inviteStaffService = async (
    inviterId: string,
    payload: {
        name: string;
        emailOrPhone: string;
        staffRole: string;
        permissions?: string[] | null;
    }
) => {
    const inviter = await UserModel.findById(inviterId);
    if (!inviter) {
        throw new AppError(status.NOT_FOUND, "Inviter not found");
    }

    assertInviterCanInvite(inviter);

    if (!isStaffRoleSlug(payload.staffRole)) {
        throw new AppError(status.BAD_REQUEST, "Invalid staff role");
    }

    const staffRole = payload.staffRole as TStaffRoleSlug;
    const emailOrPhone = normalizeIdentifier(payload.emailOrPhone);
    const name = payload.name.trim();
    const permissions = resolveStaffPermissions(staffRole, payload.permissions);

    assertInviterCanGrant(inviter, permissions);

    const existing = await UserModel.findOne({ emailOrPhone });
    if (
        existing &&
        existing.status === USER_STATUS.ACTIVE &&
        (existing.role === USER_ROLE.STAFF || isFullAccessRole(existing.role))
    ) {
        throw new AppError(status.CONFLICT, "This user is already an active team member");
    }
    if (existing?.role === USER_ROLE.USER && existing.status === USER_STATUS.ACTIVE) {
        throw new AppError(
            status.CONFLICT,
            "This email or phone is already registered as a customer account"
        );
    }

    const delivery = await deliverStaffInviteNotification({
        name,
        emailOrPhone,
        staffRole,
    });

    const placeholderPassword = await hashPassword(
        `${generateInviteToken()}${Date.now()}`
    );
    const inviterIdStr = String(inviter._id);

    let user = existing;
    if (existing) {
        existing.name = name;
        existing.role = USER_ROLE.STAFF;
        existing.staffRole = staffRole;
        existing.permissions = permissions;
        existing.status = USER_STATUS.INACTIVE;
        existing.invitedBy = inviterIdStr;
        if (!existing.password) {
            existing.password = placeholderPassword;
        }
        await existing.save();
    } else {
        user = await UserModel.create({
            name,
            emailOrPhone,
            password: placeholderPassword,
            role: USER_ROLE.STAFF,
            staffRole,
            permissions,
            status: USER_STATUS.INACTIVE,
            invitedBy: inviterIdStr,
        });
    }

    let expiresInDays: number;
    try {
        expiresInDays = await persistStaffInviteRecord({
            inviterId: inviter._id,
            userId: user!._id,
            name,
            emailOrPhone,
            staffRole,
            permissions,
            plainToken: delivery.plainToken,
            inviteCode: delivery.inviteCode,
            channel: delivery.channel,
        });
    } catch (error) {
        if (!existing) {
            await UserModel.findByIdAndDelete(user!._id);
        }
        throw error;
    }

    return {
        message: "Invite sent successfully",
        emailOrPhone,
        staffRole,
        permissions,
        channel: delivery.channel,
        expiresInDays,
    };
};

export const resendStaffInviteService = async (inviterId: string, staffUserId: string) => {
    const inviter = await UserModel.findById(inviterId);
    if (!inviter) {
        throw new AppError(status.NOT_FOUND, "Inviter not found");
    }

    assertInviterCanInvite(inviter);

    const staffUser = await UserModel.findById(staffUserId);
    if (!staffUser || staffUser.role !== USER_ROLE.STAFF) {
        throw new AppError(status.NOT_FOUND, "Staff member not found");
    }

    if (staffUser.status === USER_STATUS.ACTIVE) {
        throw new AppError(
            status.CONFLICT,
            "This team member is already active. Resend is only for pending or blocked invites."
        );
    }

    const staffRole = staffUser.staffRole;
    if (!staffRole || !isStaffRoleSlug(staffRole)) {
        throw new AppError(status.BAD_REQUEST, "Staff role is missing on this account");
    }

    const permissions =
        staffUser.permissions && staffUser.permissions.length > 0
            ? [...staffUser.permissions]
            : resolveStaffPermissions(staffRole, null);

    assertInviterCanGrant(inviter, permissions);

    const delivery = await deliverStaffInviteNotification({
        name: staffUser.name,
        emailOrPhone: staffUser.emailOrPhone,
        staffRole,
    });

    const expiresInDays = await persistStaffInviteRecord({
        inviterId: inviter._id,
        userId: staffUser._id,
        name: staffUser.name,
        emailOrPhone: staffUser.emailOrPhone,
        staffRole,
        permissions,
        plainToken: delivery.plainToken,
        inviteCode: delivery.inviteCode,
        channel: delivery.channel,
    });

    staffUser.status = USER_STATUS.INACTIVE;
    staffUser.accessToken = undefined;
    staffUser.refreshToken = undefined;
    staffUser.invitedBy = String(inviter._id);
    await staffUser.save();

    return {
        message: "Invite resent successfully",
        emailOrPhone: staffUser.emailOrPhone,
        staffRole,
        permissions,
        channel: delivery.channel,
        expiresInDays,
    };
};

const findActiveInviteBySecret = async (secret: string) => {
    const hash = hashInviteSecret(secret.trim());
    return StaffInviteModel.findOne({
        $or: [{ inviteTokenHash: hash }, { inviteCodeHash: hash }],
        isUsed: false,
        expiresAt: { $gt: new Date() },
    });
};

export const acceptStaffInviteService = async (token: string, password: string) => {
    const invite = await findActiveInviteBySecret(token);

    if (!invite) {
        throw new AppError(
            status.BAD_REQUEST,
            "Invalid or expired invite. Ask your admin to resend."
        );
    }

    const user = await UserModel.findById(invite.userId).select("+password");
    if (!user) {
        throw new AppError(status.NOT_FOUND, "User account not found for this invite");
    }

    user.password = await hashPassword(password);
    user.status = USER_STATUS.ACTIVE;
    user.role = USER_ROLE.STAFF;
    user.staffRole = invite.staffRole;
    user.permissions = invite.permissions;
    user.staffCredentialsEstablishedAt = new Date();
    await user.save();

    invite.isUsed = true;
    invite.acceptedAt = new Date();
    invite.acceptedVia = STAFF_INVITE_ACCEPTED_VIA.INVITE;
    await invite.save();
    await markUnusedInvitesConsumed(user._id, STAFF_INVITE_ACCEPTED_VIA.INVITE);

    return {
        message: "Account activated. Please log in.",
        emailOrPhone: user.emailOrPhone,
        name: user.name,
        staffRole: user.staffRole,
        permissions: getEffectivePermissions(user),
    };
};

export const listStaffService = async () => {
    const staff = await UserModel.find({
        role: USER_ROLE.STAFF,
        status: { $ne: USER_STATUS.DELETED },
        isDeleted: { $ne: true },
    })
        .select("name emailOrPhone staffRole permissions status createdAt invitedBy")
        .sort({ createdAt: -1 });

    return staff;
};

export const updateStaffPermissionsService = async (
    inviterId: string,
    staffUserId: string,
    updates: { staffRole?: string; permissions?: string[] }
) => {
    const inviter = await assertInviterCanManageStaff(inviterId);

    const staffUser = await UserModel.findById(staffUserId);
    if (
        !staffUser ||
        staffUser.role !== USER_ROLE.STAFF ||
        staffUser.status === USER_STATUS.DELETED ||
        staffUser.isDeleted
    ) {
        throw new AppError(status.NOT_FOUND, "Staff member not found");
    }

    if (updates.staffRole) {
        if (!isStaffRoleSlug(updates.staffRole)) {
            throw new AppError(status.BAD_REQUEST, "Invalid staff role");
        }
        staffUser.staffRole = updates.staffRole;
    }

    const staffRole = staffUser.staffRole as TStaffRoleSlug | undefined;
    if (!staffRole || !isStaffRoleSlug(staffRole)) {
        throw new AppError(status.BAD_REQUEST, "Staff role is required on this account");
    }

    let permissions: string[];
    if (updates.permissions !== undefined) {
        permissions = resolveStaffPermissions(staffRole, updates.permissions);
    } else if (updates.staffRole) {
        permissions = resolveStaffPermissions(staffRole, null);
    } else {
        permissions = resolveStaffPermissions(staffRole, staffUser.permissions);
    }

    assertInviterCanGrant(inviter, permissions);

    staffUser.permissions = permissions;
    staffUser.accessToken = undefined;
    staffUser.refreshToken = undefined;
    await staffUser.save();

    await syncStaffInviteRoleAndPermissions(staffUser._id, staffRole, permissions);

    return {
        _id: staffUser._id,
        name: staffUser.name,
        emailOrPhone: staffUser.emailOrPhone,
        staffRole: staffUser.staffRole,
        permissions: staffUser.permissions,
        effectivePermissions: getEffectivePermissions(staffUser),
        status: staffUser.status,
    };
};

const assertInviterCanManageStaff = async (inviterId: string) => {
    const inviter = await UserModel.findById(inviterId);
    if (!inviter) {
        throw new AppError(status.NOT_FOUND, "Inviter not found");
    }

    const inviterPerms = getEffectivePermissions(inviter);
    if (
        !hasPermission(inviterPerms, PERMISSIONS.STAFF_MANAGE) &&
        !inviterPerms.includes(PERMISSIONS.ALL)
    ) {
        throw new AppError(status.FORBIDDEN, "You cannot manage staff");
    }

    return inviter;
};

const deleteAllInvitesForStaff = async (staffUser: {
    _id: unknown;
    emailOrPhone?: string;
}) => {
    await StaffInviteModel.deleteMany({
        $or: [{ userId: staffUser._id }, { emailOrPhone: staffUser.emailOrPhone }],
    });
};

export const blockStaffService = async (inviterId: string, staffUserId: string) => {
    return updateStaffStatusService(inviterId, staffUserId, USER_STATUS.BLOCKED);
};

export const updateStaffStatusService = async (
    inviterId: string,
    staffUserId: string,
    nextStatus: string
) => {
    await assertInviterCanManageStaff(inviterId);

    const staffUser = await UserModel.findById(staffUserId);
    if (
        !staffUser ||
        staffUser.role !== USER_ROLE.STAFF ||
        staffUser.status === USER_STATUS.DELETED ||
        staffUser.isDeleted
    ) {
        throw new AppError(status.NOT_FOUND, "Staff member not found");
    }

    if (String(inviterId) === String(staffUserId) && nextStatus !== USER_STATUS.ACTIVE) {
        throw new AppError(status.BAD_REQUEST, "You cannot change your own status");
    }

    const updated = await setUserStatus(staffUserId, nextStatus);

    const message =
        nextStatus === USER_STATUS.BLOCKED
            ? "Staff member blocked"
            : nextStatus === USER_STATUS.ACTIVE
              ? "Staff member is now active"
              : "Staff member is now inactive";

    return {
        message,
        userId: staffUserId,
        status: updated.status,
    };
};

export const deleteStaffService = async (inviterId: string, staffUserId: string) => {
    await assertInviterCanManageStaff(inviterId);

    if (String(inviterId) === String(staffUserId)) {
        throw new AppError(status.BAD_REQUEST, "You cannot remove your own account");
    }

    const staffUser = await UserModel.findById(staffUserId);
    if (!staffUser || staffUser.role !== USER_ROLE.STAFF) {
        throw new AppError(status.NOT_FOUND, "Staff member not found");
    }

    const previousStatus = staffUser.status;
    const emailOrPhone = staffUser.emailOrPhone;

    await deleteAllInvitesForStaff(staffUser);
    await UserModel.findByIdAndDelete(staffUserId);

    return {
        message: "Team member deleted permanently",
        userId: staffUserId,
        emailOrPhone,
        previousStatus,
    };
};

export const getInviteLandingContext = async (token?: string) => {
    if (!token?.trim()) {
        return { valid: false, roleName: null };
    }

    const invite = await findActiveInviteBySecret(token);
    if (!invite) {
        return { valid: false, roleName: null };
    }

    return {
        valid: true,
        roleName: getStaffRoleTemplate(invite.staffRole).name,
    };
};
