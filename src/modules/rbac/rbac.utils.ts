import { USER_ROLE } from "../../constants/status.constants";
import { PERMISSIONS } from "./permissions.constants";

export const isFullAccessRole = (role?: string): boolean =>
    role === USER_ROLE.SUPER_ADMIN || role === USER_ROLE.ADMIN;

/** Effective permissions for JWT / req.user */
export const getEffectivePermissions = (user: {
    role?: string;
    permissions?: string[];
}): string[] => {
    if (isFullAccessRole(user.role)) {
        return [PERMISSIONS.ALL];
    }
    return user.permissions?.length ? [...user.permissions] : [];
};

export const hasPermission = (
    userPermissions: string[],
    required: string
): boolean => {
    if (userPermissions.includes(PERMISSIONS.ALL)) {
        return true;
    }

    if (userPermissions.includes(required)) {
        return true;
    }

    if (
        userPermissions.includes(PERMISSIONS.READ_ALL) &&
        (required === PERMISSIONS.READ_ALL || required.endsWith(":read"))
    ) {
        return true;
    }

    return false;
};

export const hasAnyPermission = (
    userPermissions: string[],
    required: string[]
): boolean => required.some((p) => hasPermission(userPermissions, p));

export const hasEveryPermission = (
    userPermissions: string[],
    required: string[]
): boolean => required.every((p) => hasPermission(userPermissions, p));

/** Inviter cannot grant permissions they do not hold */
export const assertCanGrantPermissions = (
    inviterPermissions: string[],
    toGrant: string[]
): void => {
    if (inviterPermissions.includes(PERMISSIONS.ALL)) {
        return;
    }
    const missing = toGrant.filter((p) => !hasPermission(inviterPermissions, p));
    if (missing.length > 0) {
        throw new Error(`Cannot grant permissions: ${missing.join(", ")}`);
    }
};

export const isPanelUser = (role?: string): boolean =>
    isFullAccessRole(role) || role === USER_ROLE.STAFF;
