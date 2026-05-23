import express from "express";
import { USER_ROLE } from "../../constants/status.constants";
import auth from "../../middlewares/auth";
import { APP_ROLES, panelRead } from "../../middlewares/panelAccess";
import validateRequest from "../../middlewares/validateRequest";
import { contactController } from "./contact.controller";
import { contactValidation } from "./contact.validation";

const router = express.Router();

// Admin routes
router.post(
    "/",
    auth(USER_ROLE.ADMIN),
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
    auth(USER_ROLE.ADMIN),
    validateRequest(contactValidation.updateContactZodSchema),
    contactController.updateContactController
);

router.delete(
    "/:id",
    auth(USER_ROLE.ADMIN),
    contactController.deleteContactController
);

// Public route - get active contacts
router.get(
    "/",
    auth(...APP_ROLES),
    contactController.getActiveContactsController
);

export const contactRouter = router;
