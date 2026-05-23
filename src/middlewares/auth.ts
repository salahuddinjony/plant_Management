import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { JwtPayload } from "jsonwebtoken";
import AppError from "../errors/AppError";
import { verifyAccessToken } from "../modules/auth/auth.utils";
import { getEffectivePermissions } from "../modules/rbac/rbac.utils";
import { TUserRole } from "../modules/users/users.interface";
import { UserModel } from "../modules/users/users.model";
import catchAsync from "../utils/catchAsync";

// Import express type augmentation
import "../types/express";

const auth = (...requiredRoles: TUserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const bearerToken = req.headers.authorization?.split(" ")[1];

    // if the token is not sent from the client
    if (!bearerToken) {
      throw new AppError(status.UNAUTHORIZED, "You are not authorized!");
    }

    // check if the token is valid
    const decoded = verifyAccessToken(bearerToken) as JwtPayload;

    const { id, role: tokenRole } = decoded;

    const user = await UserModel.findById(id).select(
      "+password name emailOrPhone role staffRole permissions status isDeleted"
    );

    if (!user) {
      throw new AppError(status.NOT_FOUND, "This user is not found!");
    }

    if (user.status === "blocked") {
      throw new AppError(status.FORBIDDEN, "This user is blocked!");
    }

    if (user.status === "deleted" || user.isDeleted) {
      throw new AppError(status.FORBIDDEN, "This user is deleted!");
    }

    const effectiveRole = user.role ?? tokenRole;
    if (requiredRoles.length && !requiredRoles.includes(effectiveRole as TUserRole)) {
      throw new AppError(status.FORBIDDEN, "You are not authorized!");
    }

    const permissions = getEffectivePermissions(user);

    req.user = {
      ...decoded,
      role: effectiveRole,
      staffRole: user.staffRole,
      permissions,
    };
    next();
  });
};

export default auth;
