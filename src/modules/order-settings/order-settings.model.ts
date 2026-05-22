import { model, Schema } from "mongoose";
import { TOrderSettings } from "./order-settings.interface";

const OrderSettingsSchema = new Schema<TOrderSettings>(
    {
        isActive: {
            type: Boolean,
            default: false,
        },
        tax: {
            isActive: { type: Boolean, default: true },
            taxType: {
                type: String,
                enum: ["percentage", "fixed"],
                required: true,
            },
            taxValue: {
                type: Number,
                required: true,
                min: 0,
            },
        },
        shipping: {
            shippingType: {
                type: String,
                enum: ["flat", "free_above_threshold", "free"],
                required: true,
            },
            shippingFlatAmount: {
                type: Number,
                default: 0,
                min: 0,
            },
            freeShippingMinSubtotal: {
                type: Number,
                min: 0,
            },
        },
    },
    { timestamps: true }
);

OrderSettingsSchema.index(
    { isActive: 1 },
    { unique: true, partialFilterExpression: { isActive: true } }
);

export const OrderSettingsModel = model<TOrderSettings>("order_settings", OrderSettingsSchema);
