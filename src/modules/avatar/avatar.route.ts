import { Router } from "express";
import { panelWrite } from "../../middlewares/panelAccess";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../rbac/permissions.constants";
import { upload } from "../../utils/multer";
import { avatarController } from "./avatar.controller";
import { AvatarValidation } from "./avatar.validation";

const router = Router();

router.post(
    "/create",
    ...panelWrite(PERMISSIONS.AVATARS_WRITE),
    upload.single("image"),
    validateRequest(AvatarValidation.createAvatarZodSchema),
    avatarController.createAvatar
);

router.get("/", avatarController.getAllAvatars);

router.get("/:id", avatarController.getAvatarById);

router.patch(
    "/:id",
    ...panelWrite(PERMISSIONS.AVATARS_WRITE),
    upload.single("image"),
    validateRequest(AvatarValidation.updateAvatarZodSchema),
    avatarController.updateAvatar
);

router.delete(
    "/:id",
    ...panelWrite(PERMISSIONS.AVATARS_WRITE),
    avatarController.deleteAvatar
);

export const avatarRoutes = router;
