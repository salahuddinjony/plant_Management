import { NextFunction, Request, Response } from "express";
import status from "http-status";
import AppError from "../errors/AppError";
import { USER_ROLE } from "../constants/status.constants";
import {
  getEffectivePermissions,
  hasAnyPermission,
  isFullAccessRole,
} from "../modules/rbac/rbac.utils";
import catchAsync from "../utils/catchAsync";

/**
 * Permission guard — use after `auth()`.
 * - No args: only super-admin and admin (staff blocked).
 * - With permissions: admin/super-admin pass; staff needs at least one permission.
 */
export const authorize = (...requiredPermissions: string[]) =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role as string | undefined;
    const permissions =
      (req.user?.permissions as string[] | undefined) ??
      getEffectivePermissions({
        role,
        permissions: req.user?.permissions as string[],
      });

    if (!role) {
      throw new AppError(status.UNAUTHORIZED, "You are not authorized!");
    }

    if (requiredPermissions.length === 0) {
      if (isFullAccessRole(role)) {
        return next();
      }
      throw new AppError(
        status.FORBIDDEN,
        "Only administrators can perform this action",
      );
    }

    if (isFullAccessRole(role)) {
      return next();
    }

    if (
      role === USER_ROLE.STAFF &&
      hasAnyPermission(permissions, requiredPermissions)
    ) {
      return next();
    }

    throw new AppError(
      status.FORBIDDEN,
      "You do not have permission for this action",
    );
  });

/** Staff passes if they hold any of the listed permissions (admin/super-admin always pass). */
export const authorizeAny = (...requiredPermissions: string[]) =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role as string | undefined;
    const permissions =
      (req.user?.permissions as string[] | undefined) ??
      getEffectivePermissions({
        role,
        permissions: req.user?.permissions as string[],
      });

    if (!role) {
      throw new AppError(status.UNAUTHORIZED, "You are not authorized!");
    }

    if (isFullAccessRole(role)) {
      return next();
    }

    if (
      role === USER_ROLE.STAFF &&
      requiredPermissions.some((p) => hasAnyPermission(permissions, [p]))
    ) {
      return next();
    }

    throw new AppError(
      status.FORBIDDEN,
      "You do not have permission for this action",
    );
  });
