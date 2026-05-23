import { Router } from "express";
import { USER_ROLE } from "../../constants/status.constants";
import auth from "../../middlewares/auth";
import { authorize } from "../../middlewares/authorize";
import { panelRead } from "../../middlewares/panelAccess";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../rbac/permissions.constants";
import { staffController } from "./staff.controller";
import {
    acceptStaffInviteZodSchema,
    inviteStaffZodSchema,
    staffUserIdParamsSchema,
    updateStaffZodSchema,
} from "./staff.validation";

const staffRouter = Router();

staffRouter.post(
    "/accept-invite",
    validateRequest(acceptStaffInviteZodSchema),
    staffController.acceptStaffInvite
);

staffRouter.post(
    "/invite",
    auth(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.STAFF),
    authorize(PERMISSIONS.STAFF_INVITE),
    validateRequest(inviteStaffZodSchema),
    staffController.inviteStaff
);

staffRouter.get("/", ...panelRead, staffController.listStaff);

staffRouter.post(
    "/:staffUserId/resend-invite",
    auth(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.STAFF),
    authorize(PERMISSIONS.STAFF_INVITE),
    validateRequest(staffUserIdParamsSchema),
    staffController.resendStaffInvite
);

staffRouter.patch(
    "/:staffUserId",
    auth(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.STAFF),
    authorize(PERMISSIONS.STAFF_MANAGE),
    validateRequest(updateStaffZodSchema),
    staffController.updateStaff
);

staffRouter.patch(
    "/:staffUserId/block",
    auth(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.STAFF),
    authorize(PERMISSIONS.STAFF_MANAGE),
    validateRequest(staffUserIdParamsSchema),
    staffController.blockStaff
);

staffRouter.delete(
    "/:staffUserId",
    auth(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.STAFF),
    authorize(PERMISSIONS.STAFF_MANAGE),
    validateRequest(staffUserIdParamsSchema),
    staffController.deleteStaff
);

export default staffRouter;
