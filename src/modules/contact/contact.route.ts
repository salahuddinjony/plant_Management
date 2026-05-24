import express from "express";
import { APP_ROLES, panelRead, panelWrite } from "../../middlewares/panelAccess";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../rbac/permissions.constants";
import { contactController } from "./contact.controller";
import { contactValidation } from "./contact.validation";

const router = express.Router();

router.post(
    "/",
    ...panelWrite(PERMISSIONS.CONTACTS_WRITE),
    validateRequest(contactValidation.createContactZodSchema),
    contactController.createContactController
);

router.get("/admin/all", ...panelRead, contactController.getAllContactsController);

router.get(
    "/:id",
    auth(...APP_ROLES),
    contactController.getContactByIdController
);

router.patch(
    "/:id",
    ...panelWrite(PERMISSIONS.CONTACTS_WRITE),
    validateRequest(contactValidation.updateContactZodSchema),
    contactController.updateContactController
);

router.delete(
    "/:id",
    ...panelWrite(PERMISSIONS.CONTACTS_WRITE),
    contactController.deleteContactController
);

router.get(
    "/",
    auth(...APP_ROLES),
    contactController.getActiveContactsController
);

export const contactRouter = router;
