export type TOrderSettingsTax = {
    isActive: boolean;
    taxType: "percentage" | "fixed";
    taxValue: number;
};

export type TOrderSettingsShipping = {
    shippingType: "flat" | "free_above_threshold" | "free";
    /** Required when shippingType is flat or free_above_threshold; auto 0 when free */
    shippingFlatAmount: number;
    /** Required when shippingType is free_above_threshold; auto 0 when flat or free */
    freeShippingMinSubtotal?: number;
    /** Categories covered by this non-default delivery setting. */
    categoryIds?: string[];
};

export type TOrderSettings = {
    name: string;
    isDefault: boolean;
    isActive: boolean;
    tax: TOrderSettingsTax;
    shipping: TOrderSettingsShipping;
    createdAt?: Date;
    updatedAt?: Date;
};

export type TOrderSettingsCreateInput = {
    name?: string;
    isDefault?: boolean;
    setAsActive?: boolean;
    tax?: Partial<TOrderSettingsTax>;
    shipping: TOrderSettingsShipping;
};

export type TOrderSettingsUpdateInput = {
    name?: string;
    isDefault?: boolean;
    setAsActive?: boolean;
    tax?: Partial<TOrderSettingsTax>;
    shipping?: Partial<TOrderSettingsShipping>;
};
