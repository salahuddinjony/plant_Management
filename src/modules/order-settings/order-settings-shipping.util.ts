import AppError from "../../errors/AppError";
import { TOrderSettingsShipping } from "./order-settings.interface";

type ShippingInput = {
    shippingType: TOrderSettingsShipping["shippingType"];
    shippingFlatAmount?: number;
    freeShippingMinSubtotal?: number;
};

/** Apply type-specific defaults (e.g. free → amounts 0). */
export const normalizeShipping = (input: ShippingInput): TOrderSettingsShipping => {
    if (input.shippingType === "free") {
        return {
            shippingType: "free",
            shippingFlatAmount: 0,
            freeShippingMinSubtotal: 0,
        };
    }

    if (input.shippingType === "flat") {
        return {
            shippingType: "flat",
            shippingFlatAmount: input.shippingFlatAmount ?? 0,
            freeShippingMinSubtotal: 0,
        };
    }

    return {
        shippingType: "free_above_threshold",
        shippingFlatAmount: input.shippingFlatAmount ?? 0,
        freeShippingMinSubtotal: input.freeShippingMinSubtotal ?? 0,
    };
};

export const validateShipping = (shipping: TOrderSettingsShipping) => {
    if (shipping.shippingType === "flat") {
        if (shipping.shippingFlatAmount == null || shipping.shippingFlatAmount < 0) {
            throw new AppError(400, "shippingFlatAmount is required when shippingType is flat");
        }
        return;
    }

    if (shipping.shippingType === "free_above_threshold") {
        if (shipping.shippingFlatAmount == null || shipping.shippingFlatAmount < 0) {
            throw new AppError(
                400,
                "shippingFlatAmount is required when shippingType is free_above_threshold"
            );
        }
        if (shipping.freeShippingMinSubtotal == null || shipping.freeShippingMinSubtotal < 0) {
            throw new AppError(
                400,
                "freeShippingMinSubtotal is required when shippingType is free_above_threshold"
            );
        }
    }
};

export const mergeAndNormalizeShipping = (
    existing: TOrderSettingsShipping,
    patch: Partial<TOrderSettingsShipping>
): TOrderSettingsShipping => {
    const merged: ShippingInput = {
        shippingType: patch.shippingType ?? existing.shippingType,
        shippingFlatAmount:
            patch.shippingFlatAmount !== undefined
                ? patch.shippingFlatAmount
                : existing.shippingFlatAmount,
        freeShippingMinSubtotal:
            patch.freeShippingMinSubtotal !== undefined
                ? patch.freeShippingMinSubtotal
                : existing.freeShippingMinSubtotal,
    };

    const normalized = normalizeShipping(merged);
    validateShipping(normalized);
    return normalized;
};

export const prepareShippingForCreate = (
    shipping: TOrderSettingsShipping
): TOrderSettingsShipping => {
    const normalized = normalizeShipping(shipping);
    validateShipping(normalized);
    return normalized;
};
