import { USER_ROLE } from "../constants/status.constants";
import { PERMISSIONS } from "../modules/rbac/permissions.constants";
import { TUserRole } from "../modules/users/users.interface";
import auth from "./auth";
import { authorize } from "./authorize";

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
 * Admin-panel GET: staff with `*:read` (all role templates include it).
 * Super-admin and admin always pass.
 */
export const panelRead = [
    auth(...PANEL_ROLES),
    authorize(PERMISSIONS.READ_ALL),
];
