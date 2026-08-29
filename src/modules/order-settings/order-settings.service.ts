import { ClientSession } from "mongoose";
import AppError from "../../errors/AppError";
import { CategoryModel } from "../category/category.model";
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

const normalizeCategoryIds = (categoryIds: unknown[] = []) =>
    [...new Set(categoryIds.map((id) => String(id).trim()).filter(Boolean))];

const assertCategoriesExist = async (
    categoryIds: string[],
    session?: ClientSession
) => {
    if (!categoryIds.length) return;

    const countQuery = CategoryModel.countDocuments({ _id: { $in: categoryIds } });
    if (session) countQuery.session(session);

    const count = await countQuery;
    if (count !== categoryIds.length) {
        throw new AppError(400, "One or more selected categories were not found");
    }
};

const getDefaultFilter = () => ({
    $or: [{ isDefault: true }, { isDefault: { $exists: false } }],
});

const deactivateDefaults = async (exceptId?: string | null) => {
    const filter = exceptId
        ? { ...getDefaultFilter(), _id: { $ne: exceptId } }
        : getDefaultFilter();
    await OrderSettingsModel.updateMany(filter, { $set: { isActive: false } });
};

const activateSettings = async (id: string) => {
    const doc = await OrderSettingsModel.findById(id);
    if (!doc) {
        throw new AppError(404, "Order settings not found");
    }

    if (doc.isDefault ?? true) {
        await deactivateDefaults(id);
    }
    doc.isDefault = doc.isDefault ?? true;
    doc.name = doc.name || (doc.isDefault ? "Default Delivery Charge" : "Delivery Settings");
    doc.isActive = true;
    await doc.save();
    return doc;
};

export const getActiveOrderSettingsService = async () => {
    const settings = await OrderSettingsModel.findOne({
        isActive: true,
        ...getDefaultFilter(),
    });
    if (!settings) {
        throw new AppError(404, "No active default order pricing settings found");
    }
    return settings;
};

export const getActiveCategoryOrderSettingsService = async (session?: ClientSession) => {
    const query = OrderSettingsModel.find({
        isDefault: false,
        isActive: true,
        "shipping.categoryIds.0": { $exists: true },
    });
    if (session) query.session(session);
    return query;
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
    const hasDefault = await OrderSettingsModel.exists(getDefaultFilter());
    const isDefault = data.isDefault ?? !hasDefault;
    const categoryIds = normalizeCategoryIds(data.shipping.categoryIds);

    if (isDefault && categoryIds.length > 0) {
        throw new AppError(400, "A default delivery setting cannot have categories");
    }
    if (!isDefault && categoryIds.length === 0) {
        throw new AppError(
            400,
            "Select at least one category for a category delivery setting"
        );
    }
    if (!isDefault && !data.name?.trim()) {
        throw new AppError(400, "Name is required for a category delivery setting");
    }

    if (isDefault && hasDefault) {
        throw new AppError(400, "A default delivery setting already exists");
    }

    await assertCategoriesExist(categoryIds);

    if (
        !isDefault &&
        !(await OrderSettingsModel.exists({
            ...getDefaultFilter(),
            isActive: true,
        }))
    ) {
        throw new AppError(
            400,
            "Create and activate the default delivery setting first"
        );
    }

    const isActive = data.setAsActive === true;
    if (isDefault && isActive) {
        await deactivateDefaults();
    }

    const payload: TOrderSettings = {
        name: isDefault ? "Default Delivery Charge" : data.name!.trim(),
        isDefault,
        isActive,
        tax: prepareTaxForCreate(data.tax),
        shipping: prepareShippingForCreate({ ...data.shipping, categoryIds }),
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

    const existingIsDefault = existing.isDefault ?? true;
    const nextIsDefault = data.isDefault ?? existingIsDefault;
    const categoryIds = normalizeCategoryIds(
        data.shipping?.categoryIds ?? existing.shipping.categoryIds
    );

    if (existingIsDefault && data.isDefault === false) {
        const anotherDefault = await OrderSettingsModel.exists({
            _id: { $ne: id },
            ...getDefaultFilter(),
        });
        if (!anotherDefault) {
            throw new AppError(
                400,
                "Cannot remove the only default delivery setting"
            );
        }
    }

    if (nextIsDefault && categoryIds.length > 0) {
        throw new AppError(400, "A default delivery setting cannot have categories");
    }
    if (!nextIsDefault && categoryIds.length === 0) {
        throw new AppError(
            400,
            "Select at least one category for a category delivery setting"
        );
    }

    const nextName = nextIsDefault
        ? "Default Delivery Charge"
        : data.name?.trim() ?? existing.name;
    if (!nextIsDefault && !nextName?.trim()) {
        throw new AppError(400, "Name is required for a category delivery setting");
    }

    await assertCategoriesExist(categoryIds);

    if (nextIsDefault && !existingIsDefault) {
        const anotherDefault = await OrderSettingsModel.exists({
            _id: { $ne: id },
            ...getDefaultFilter(),
        });
        if (anotherDefault) {
            throw new AppError(400, "A default delivery setting already exists");
        }
    }

    if (data.tax) {
        existing.tax = { ...existing.tax, ...data.tax };
    }
    const shippingPatch = data.shipping
        ? { ...data.shipping, categoryIds }
        : { categoryIds };
    existing.shipping = mergeAndNormalizeShipping(existing.shipping, shippingPatch);

    if (data.setAsActive === true) {
        if (nextIsDefault) {
            await deactivateDefaults(id);
        }
        existing.isActive = true;
    } else if (data.setAsActive === false) {
        existing.isActive = false;
    }

    existing.name = nextName;
    existing.isDefault = nextIsDefault;
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

    if (settings.isDefault ?? true) {
        throw new AppError(400, "The default delivery setting cannot be deleted");
    }

    await OrderSettingsModel.findByIdAndDelete(id);
    return settings;
};

export const orderSettingsService = {
    getActiveOrderSettingsService,
    getActiveCategoryOrderSettingsService,
    getAllOrderSettingsService,
    getOrderSettingsByIdService,
    createOrderSettingsService,
    updateOrderSettingsService,
    activateOrderSettingsService,
    deleteOrderSettingsService,
    calculateOrderCharges,
};
