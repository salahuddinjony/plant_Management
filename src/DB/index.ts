import config from "../config";
import { USER_ROLE, USER_STATUS } from "../constants/status.constants";
import { hashPassword } from "../modules/auth/auth.utils";
import { OrderSettingsModel } from "../modules/order-settings/order-settings.model";
import { UserModel } from "../modules/users/users.model";

const superUser = {
    name: "Super Admin",
    emailOrPhone: "nurserybazarbd2008@gmail.com",
    // needsPasswordChange: true,
    role: USER_ROLE.SUPER_ADMIN,
    status: USER_STATUS.ACTIVE,
    isDeleted: false,
};

const seedSuperAdmin = async () => {
    const isSuperAdminExist = await UserModel.findOne({ role: USER_ROLE.SUPER_ADMIN });
    if (!isSuperAdminExist) {
        const hashedPassword = await hashPassword(config.super_admin_password as string);
        await UserModel.create({
            ...superUser,
            password: hashedPassword,
        });
    }
};

const seedOrderSettings = async () => {
    const hasActive = await OrderSettingsModel.exists({ isActive: true });
    if (!hasActive) {
        await OrderSettingsModel.create({
            isActive: true,
            tax: {
                isActive: false,
                taxType: "percentage",
                taxValue: 0,
            },
            shipping: {
                isActive: false,
                shippingType: "free_above_threshold",
                shippingFlatAmount: 0,
                freeShippingMinSubtotal: 0,
            },
        });
    }
};

const seedDatabase = async () => {
    await seedSuperAdmin();
    await seedOrderSettings();
};

export default seedDatabase;
