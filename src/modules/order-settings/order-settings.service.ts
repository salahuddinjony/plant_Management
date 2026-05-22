import AppError from "../../errors/AppError";
import {
    TOrderSettings,
    TOrderSettingsCreateInput,
    TOrderSettingsUpdateInput,
} from "./order-settings.interface";
import { OrderSettingsModel } from "./order-settings.model";
import {
    mergeAndNormalizeShipping,
    prepareShippingForCreate,
} from "./order-settings-shipping.util";
import { calculateOrderCharges, prepareTaxForCreate } from "./order-settings.utils";

export { calculateOrderCharges };

const deactivateAll = async (exceptId?: string | null) => {
    const filter = exceptId ? { _id: { $ne: exceptId } } : {};
    await OrderSettingsModel.updateMany(filter, { $set: { isActive: false } });
};

const activateSettings = async (id: string) => {
    const doc = await OrderSettingsModel.findById(id);
    if (!doc) {
        throw new AppError(404, "Order settings not found");
    }
    await deactivateAll(id);
    doc.isActive = true;
    await doc.save();
    return doc;
};

export const getActiveOrderSettingsService = async () => {
    const settings = await OrderSettingsModel.findOne({ isActive: true });
    if (!settings) {
        throw new AppError(404, "No active order pricing settings found");
    }
    return settings;
};

export const getAllOrderSettingsService = async () => {
    return OrderSettingsModel.find();
};

export const getOrderSettingsByIdService = async (id: string) => {
    const settings = await OrderSettingsModel.findById(id);
    if (!settings) {
        throw new AppError(404, "Order settings not found");
    }
    return settings;
};

export const createOrderSettingsService = async (data: TOrderSettingsCreateInput) => {
    const hasActive = await OrderSettingsModel.exists({ isActive: true });

    // New profiles are inactive by default. setAsActive only applies when no profile is active yet.
    // If another profile is already active, ignore setAsActive and create inactive (use PATCH /:id/activate).
    let isActive = false;
    if (data.setAsActive === true && !hasActive) {
        await deactivateAll();
        isActive = true;
    }

    const payload: TOrderSettings = {
        isActive,
        tax: prepareTaxForCreate(data.tax),
        shipping: prepareShippingForCreate(data.shipping),
    };

    return OrderSettingsModel.create(payload);
};

export const updateOrderSettingsService = async (
    id: string,
    data: TOrderSettingsUpdateInput
) => {
    const existing = await OrderSettingsModel.findById(id);
    if (!existing) {
        throw new AppError(404, "Order settings not found");
    }

    if (data.tax) {
        existing.tax = { ...existing.tax, ...data.tax };
    }
    if (data.shipping) {
        existing.shipping = mergeAndNormalizeShipping(existing.shipping, data.shipping);
    }

    if (data.setAsActive === true) {
        await deactivateAll(id);
        existing.isActive = true;
    } else if (data.setAsActive === false) {
        existing.isActive = false;
    }

    await existing.save();
    return existing;
};

export const activateOrderSettingsService = async (id: string) => {
    return activateSettings(id);
};

export const deleteOrderSettingsService = async (id: string) => {
    const settings = await OrderSettingsModel.findById(id);
    if (!settings) {
        throw new AppError(404, "Order settings not found");
    }

    if (settings.isActive) {
        const total = await OrderSettingsModel.countDocuments();
        if (total <= 1) {
            throw new AppError(
                400,
                "Cannot delete the only order settings profile. Create another and activate it first."
            );
        }
        throw new AppError(
            400,
            "Cannot delete active order settings. Activate another profile first."
        );
    }

    await OrderSettingsModel.findByIdAndDelete(id);
    return settings;
};

export const orderSettingsService = {
    getActiveOrderSettingsService,
    getAllOrderSettingsService,
    getOrderSettingsByIdService,
    createOrderSettingsService,
    updateOrderSettingsService,
    activateOrderSettingsService,
    deleteOrderSettingsService,
    calculateOrderCharges,
};
