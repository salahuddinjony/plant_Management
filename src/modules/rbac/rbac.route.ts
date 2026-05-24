import { Router } from "express";
import auth from "../../middlewares/auth";
import { PANEL_ROLES, panelGuard } from "../../middlewares/panelAccess";
import { PERMISSIONS } from "./permissions.constants";
import { rbacController } from "./rbac.controller";

const rbacRouter = Router();

rbacRouter.get("/permissions", auth(...PANEL_ROLES), rbacController.listPermissions);

rbacRouter.get(
    "/role-templates",
    ...panelGuard(PERMISSIONS.STAFF_INVITE),
    rbacController.listRoleTemplates
);

export default rbacRouter;
