/**
 * User routes for the Catering App API
 * @module UserRoutes
 */

import { Router } from "express";
import { USER_ROLE } from "../../constants/status.constants";
import auth from "../../middlewares/auth";
import { APP_ROLES, PANEL_ROLES, panelRead } from "../../middlewares/panelAccess";
import validateRequest from "../../middlewares/validateRequest";
import { upload } from "../../utils/multer";
import { userController } from "./users.controller";
import { UserValidation } from "./users.validation";

const router = Router();

/**
 * @route GET /user/profile
 * @group User - User profile management
 * @security JWT
 */
router.get(
  "/profile",
  auth(...APP_ROLES),
  userController.getProfile
);

/**
 * @route PATCH /user/update
 * @group User - User profile management
 * @security JWT
 * @param {UpdateProfileRequest.model} request.body.required - User profile data
 * @returns {object} 200 - Profile updated successfully
 * @returns {ErrorResponse.model} 400 - Invalid input data
 * @returns {ErrorResponse.model} 401 - Unauthorized
 */
router.patch(
  "/update",
  auth(USER_ROLE.ADMIN, USER_ROLE.USER, USER_ROLE.SUPER_ADMIN),
  upload.single("profilePicture"),
  validateRequest(UserValidation.updateProfileZodSchema),
  userController.updateProfile
);

/**
 * @route GET /all-users
 * @group User - Admin can see all registered users list
 */
router.get("/all-users", ...panelRead, userController.getAllUsers);

/**
 * @route PATCH /user/update-status
 * @group User - Admin can update user status
 * @security JWT
 * @param {UpdateStatusRequest.model} request.body.required - User status data
 * @returns {object} 200 - User status updated successfully
 * @returns {ErrorResponse.model} 400 - Invalid input data
 * @returns {ErrorResponse.model} 401 - Unauthorized
 */
router.patch(
  "/update-status/:userId",
  auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  validateRequest(UserValidation.updateStatusZodSchema),
  userController.updateStatus
);

/**
 * @route DELETE /users/delete/:userId
 * @group User - Delete user (soft delete)
 * @security JWT
 */
router.delete(
  "/delete/:userId",
  auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN, USER_ROLE.USER),
  userController.deleteUser
);


export const userRoute = router;
