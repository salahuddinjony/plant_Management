import { Router } from "express";
import { panelRead, panelWrite } from "../../middlewares/panelAccess";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../rbac/permissions.constants";
import { purchaseDisclaimerController } from "./purchase-disclaimer.controller";
import {
    createPurchaseDisclaimerZodSchema,
    purchaseDisclaimerIdParamsSchema,
    reorderPurchaseDisclaimersZodSchema,
    updatePurchaseDisclaimerZodSchema,
} from "./purchase-disclaimer.validation";

const purchaseDisclaimerRouter = Router();

/** Customer app — active disclaimers only, sorted by orderNumber (no auth). */
purchaseDisclaimerRouter.get("/active", purchaseDisclaimerController.getActivePurchaseDisclaimers);

/** Admin — all disclaimers (including inactive). */
purchaseDisclaimerRouter.get(
    "/admin/all",
    ...panelRead,
    purchaseDisclaimerController.getAllPurchaseDisclaimersAdmin
);

purchaseDisclaimerRouter.post(
    "/",
    ...panelWrite(PERMISSIONS.POLICIES_WRITE),
    validateRequest(createPurchaseDisclaimerZodSchema),
    purchaseDisclaimerController.createPurchaseDisclaimer
);

/** Bulk reorder after drag-and-drop (all ids required, in display order). */
purchaseDisclaimerRouter.put(
    "/reorder",
    ...panelWrite(PERMISSIONS.POLICIES_WRITE),
    validateRequest(reorderPurchaseDisclaimersZodSchema),
    purchaseDisclaimerController.reorderAllPurchaseDisclaimers
);

purchaseDisclaimerRouter.get(
    "/:id",
    ...panelRead,
    validateRequest(purchaseDisclaimerIdParamsSchema),
    purchaseDisclaimerController.getPurchaseDisclaimerById
);

purchaseDisclaimerRouter.patch(
    "/:id",
    ...panelWrite(PERMISSIONS.POLICIES_WRITE),
    validateRequest(updatePurchaseDisclaimerZodSchema),
    purchaseDisclaimerController.updatePurchaseDisclaimer
);

purchaseDisclaimerRouter.delete(
    "/:id",
    ...panelWrite(PERMISSIONS.POLICIES_WRITE),
    validateRequest(purchaseDisclaimerIdParamsSchema),
    purchaseDisclaimerController.deletePurchaseDisclaimer
);

export default purchaseDisclaimerRouter;
