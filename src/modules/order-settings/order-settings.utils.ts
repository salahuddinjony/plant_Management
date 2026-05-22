import { TOrderSettings, TOrderSettingsTax } from "./order-settings.interface";

type TaxCreateInput = Partial<TOrderSettingsTax> | undefined;

/** Omit tax on create → tax off. Send tax with isActive true → taxType and taxValue required via Zod. */
export const prepareTaxForCreate = (tax?: TaxCreateInput): TOrderSettingsTax => {
    if (!tax || tax.isActive !== true) {
        return {
            isActive: false,
            taxType: tax?.taxType ?? "percentage",
            taxValue: tax?.taxValue ?? 0,
        };
    }

    return {
        isActive: true,
        taxType: tax.taxType ?? "percentage",
        taxValue: tax.taxValue ?? 0,
    };
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export const calculateOrderCharges = (
    subtotal: number,
    settings: TOrderSettings
): { tax: number; shippingCost: number } => {
    let tax = 0;

    if (settings.tax.isActive) {
        if (settings.tax.taxType === "percentage") {
            tax = (subtotal * settings.tax.taxValue) / 100;
        } else {
            tax = settings.tax.taxValue;
        }
    }

    let shippingCost = 0;
    const { shipping } = settings;

    switch (shipping.shippingType) {
        case "free":
            shippingCost = 0;
            break;
        case "flat":
            shippingCost = shipping.shippingFlatAmount;
            break;
        case "free_above_threshold": {
            const min = shipping.freeShippingMinSubtotal ?? 0;
            shippingCost = subtotal >= min ? 0 : shipping.shippingFlatAmount;
            break;
        }
    }

    return {
        tax: round2(tax),
        shippingCost: round2(shippingCost),
    };
};
