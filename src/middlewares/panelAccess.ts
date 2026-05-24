import { USER_ROLE } from "../constants/status.constants";
import { PERMISSIONS } from "../modules/rbac/permissions.constants";
import { TUserRole } from "../modules/users/users.interface";
import auth from "./auth";
import { authorize, authorizeAny } from "./authorize";

/** Super-admin, admin, and staff (admin panel). */
export const PANEL_ROLES: TUserRole[] = [
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.ADMIN,
    USER_ROLE.STAFF,
];

/** Customer app + admin panel (for shared catalog/checkout GET routes). */
export const APP_ROLES: TUserRole[] = [
    USER_ROLE.USER,
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.ADMIN,
    USER_ROLE.STAFF,
];

/**
 * Panel route guard: authenticated panel user + permission check.
 * Super-admin and admin always pass `authorize` / `authorizeAny`.
 */
export const panelGuard = (...requiredPermissions: string[]) => {
    const chain = [auth(...PANEL_ROLES)];
    if (requiredPermissions.length === 1) {
        chain.push(authorize(requiredPermissions[0]));
    } else if (requiredPermissions.length > 1) {
        chain.push(authorizeAny(...requiredPermissions));
    }
    return chain;
};

/** Admin-panel write action (single permission). */
export const panelWrite = (permission: string) => panelGuard(permission);

/**
 * Admin-panel GET: staff need `*:read` or the specific read permission passed in.
 * Default: `*:read` (all role templates include it).
 */
export const panelRead = panelGuard(PERMISSIONS.READ_ALL);

/** List customers/users in admin panel. */
export const panelUsersRead = panelGuard(
    PERMISSIONS.READ_ALL,
    PERMISSIONS.USERS_READ
);
