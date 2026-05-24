import { Router } from "express";
import { panelRead, panelWrite } from "../../middlewares/panelAccess";
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
    ...panelWrite(PERMISSIONS.STAFF_INVITE),
    validateRequest(inviteStaffZodSchema),
    staffController.inviteStaff
);

staffRouter.get("/", ...panelRead, staffController.listStaff);

staffRouter.post(
    "/:staffUserId/resend-invite",
    ...panelWrite(PERMISSIONS.STAFF_INVITE),
    validateRequest(staffUserIdParamsSchema),
    staffController.resendStaffInvite
);

/** Update existing staff `staffRole` and/or `permissions` (syncs all staff_invites for user). */
staffRouter.patch(
    "/:staffUserId",
    ...panelWrite(PERMISSIONS.STAFF_MANAGE),
    validateRequest(updateStaffZodSchema),
    staffController.updateStaff
);

staffRouter.patch(
    "/:staffUserId/block",
    ...panelWrite(PERMISSIONS.STAFF_MANAGE),
    validateRequest(staffUserIdParamsSchema),
    staffController.blockStaff
);

staffRouter.delete(
    "/:staffUserId",
    ...panelWrite(PERMISSIONS.STAFF_MANAGE),
    validateRequest(staffUserIdParamsSchema),
    staffController.deleteStaff
);

export default staffRouter;
