import express, { NextFunction, Request, Response } from 'express';
import { USER_ROLE } from "../../constants/status.constants";
import auth from "../../middlewares/auth";
import { APP_ROLES, panelRead } from "../../middlewares/panelAccess";
import validateRequest from "../../middlewares/validateRequest";
import { upload } from "../../utils/multer";
import { flashSaleController } from "./flash-sale.controller";
import { flashSaleValidation } from "./flash-sale.validation";

const router = express.Router();

/**
 * @description Create a new flash sale
 * @param req - The request object
 * @param res - The response object
 * @returns The created flash sale
 */
router.post(
    "/",
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    upload.single("image"),
    // parse form data into json middleware
    (req: Request, res: Response, next: NextFunction) => {
        req.body = JSON.parse(req.body.data)
        next()
    },
    validateRequest(flashSaleValidation.createFlashSaleZodSchema),
    flashSaleController.createFlashSaleController
);

/**
 * @description Update a flash sale by ID
 * @param req - The request object
 * @param res - The response object
 * @returns The updated flash sale
 */
router.patch(
    "/:id",
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    upload.single("image"),
    // parse form data into json middleware
    (req: Request, res: Response, next: NextFunction) => {
        req.body = JSON.parse(req.body.data)
        next()
    },
    validateRequest(flashSaleValidation.updateFlashSaleZodSchema),
    flashSaleController.updateFlashSaleController
);

/**
 * @description Delete a flash sale by ID
 * @param req - The request object
 * @param res - The response object
 * @returns The deleted flash sale
 */
router.delete(
    "/:id",
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    flashSaleController.deleteFlashSaleController
);

/**
 * @description Get all featured flash sales
 * @param req - The request object
 * @param res - The response object
 * @returns All featured flash sales
 */
router.get(
    "/featured",
    auth(...APP_ROLES),
    flashSaleController.getFeaturedFlashSalesController
);

/**
 * @description Get all active flash sales
 * @param req - The request object
 * @param res - The response object
 * @returns All active flash sales
 */
router.get(
    "/active",
    auth(...APP_ROLES),
    flashSaleController.getActiveFlashSalesController
);

/**
 * @description Get a flash sale by ID
 * @param req - The request object
 * @param res - The response object
 * @returns The flash sale with the specified ID
 */
router.get(
    "/:id",
    auth(...APP_ROLES),
    flashSaleController.getFlashSaleByIdController
);

/**
 * @description Get all flash sales
 * @param req - The request object
 * @param res - The response object
 * @returns All flash sales
 */
router.get("/", ...panelRead, flashSaleController.getAllFlashSalesController);

export const flashSaleRoutes = router;
