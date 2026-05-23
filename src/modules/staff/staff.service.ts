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

    const placeholderPassword = await hashPassword(
        `${generateInviteToken()}${Date.now()}`
    );

    const user =
        existing ??
        (await UserModel.create({
            name: payload.name.trim(),
            emailOrPhone,
            password: placeholderPassword,
            role: USER_ROLE.STAFF,
            staffRole,
            permissions,
            status: USER_STATUS.INACTIVE,
            invitedBy: String(inviter._id),
        }));

    if (existing) {
        existing.name = payload.name.trim();
        existing.role = USER_ROLE.STAFF;
        existing.staffRole = staffRole;
        existing.permissions = permissions;
        existing.status = USER_STATUS.INACTIVE;
        existing.invitedBy = String(inviter._id);
        if (!existing.password) {
            existing.password = placeholderPassword;
        }
        await existing.save();
    }

    return issueStaffInvite({
        inviterId: inviter._id,
        user,
        name: payload.name.trim(),
        emailOrPhone,
        staffRole,
        permissions,
        message: "Invite sent successfully",
    });
};

const issueStaffInvite = async ({
    inviterId,
    user,
    name,
    emailOrPhone,
    staffRole,
    permissions,
    message,
}: {
    inviterId: unknown;
    user: { _id: unknown };
    name: string;
    emailOrPhone: string;
    staffRole: TStaffRoleSlug;
    permissions: string[];
    message: string;
}) => {
    const channel = getIdentifierChannel(emailOrPhone);
    const expiryMs = getStaffInviteExpiryMs();

    await StaffInviteModel.deleteMany({
        $or: [{ emailOrPhone }, { userId: user._id }],
    });

    const plainToken = generateInviteToken();
    const inviteCode = generateInviteCode();
    const expiresAt = new Date(Date.now() + expiryMs);

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
        userId: user._id,
    });

    const notification = await sendStaffInviteNotification({
        name,
        emailOrPhone,
        channel,
        staffRole,
        plainToken,
        inviteCode,
    });

    const expiresInDays = Math.round(expiryMs / (24 * 60 * 60 * 1000));

    return {
        message,
        emailOrPhone,
        staffRole,
        permissions,
        channel: notification.channel,
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

    staffUser.status = USER_STATUS.INACTIVE;
    staffUser.accessToken = undefined;
    staffUser.refreshToken = undefined;
    staffUser.invitedBy = String(inviter._id);
    await staffUser.save();

    return issueStaffInvite({
        inviterId: inviter._id,
        user: staffUser,
        name: staffUser.name,
        emailOrPhone: staffUser.emailOrPhone,
        staffRole,
        permissions,
        message: "Invite resent successfully",
    });
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
    await user.save();

    invite.isUsed = true;
    invite.acceptedAt = new Date();
    await invite.save();

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

    const staffRole = (staffUser.staffRole ?? updates.staffRole) as TStaffRoleSlug;
    if (!staffRole || !isStaffRoleSlug(staffRole)) {
        throw new AppError(status.BAD_REQUEST, "Staff role is required");
    }

    const permissions = resolveStaffPermissions(
        staffRole,
        updates.permissions ?? staffUser.permissions
    );
    assertInviterCanGrant(inviter, permissions);

    staffUser.permissions = permissions;
    await staffUser.save();

    return staffUser;
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

    staffUser.status = USER_STATUS.BLOCKED;
    staffUser.accessToken = undefined;
    staffUser.refreshToken = undefined;
    await staffUser.save();

    return { message: "Staff member blocked", userId: staffUserId };
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
