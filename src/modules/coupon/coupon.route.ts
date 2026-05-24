import { Router } from "express";
import auth from "../../middlewares/auth";
import { panelRead, panelWrite } from "../../middlewares/panelAccess";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../rbac/permissions.constants";
import { couponController } from "./coupon.controller";
import { couponValidation } from "./coupon.validation";

const couponRouter = Router();

couponRouter.post(
    "/",
    ...panelWrite(PERMISSIONS.COUPONS_WRITE),
    validateRequest(couponValidation.createCouponZodSchema),
    couponController.createCoupon
);

couponRouter.get("/", ...panelRead, couponController.getAllCoupons);

couponRouter.get("/:code", ...panelRead, couponController.getCouponByCode);

couponRouter.post(
    "/validate",
    auth(),
    validateRequest(couponValidation.applyCouponZodSchema),
    couponController.validateCoupon
);

couponRouter.post("/apply", auth(), couponController.applyCoupon);

couponRouter.patch(
    "/:couponId",
    ...panelWrite(PERMISSIONS.COUPONS_WRITE),
    validateRequest(couponValidation.updateCouponZodSchema),
    couponController.updateCoupon
);

couponRouter.delete(
    "/:couponId",
    ...panelWrite(PERMISSIONS.COUPONS_WRITE),
    couponController.deleteCoupon
);

export default couponRouter;
