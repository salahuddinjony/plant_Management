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
};

export type TOrderSettings = {
    isActive: boolean;
    tax: TOrderSettingsTax;
    shipping: TOrderSettingsShipping;
    createdAt?: Date;
    updatedAt?: Date;
};

export type TOrderSettingsCreateInput = {
    setAsActive?: boolean;
    tax?: Partial<TOrderSettingsTax>;
    shipping: TOrderSettingsShipping;
};

export type TOrderSettingsUpdateInput = {
    setAsActive?: boolean;
    tax?: Partial<TOrderSettingsTax>;
    shipping?: Partial<TOrderSettingsShipping>;
};
