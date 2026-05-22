import { model, Schema } from "mongoose";
import { ADDRESS_LABELS, DEFAULT_ADDRESS_LABEL } from "./address.constants";
import { TAddress } from "./address.interface";

const AddressSchema = new Schema<TAddress>(
    {
        userId: {
            type: String,
            required: true,
        },
        street: {
            type: String,
            trim: true,
        },
        city: {
            type: String,
            required: true,
            trim: true,
        },
        postalCode: {
            type: String,
            trim: true,
        },
        country: {
            type: String,
            required: true,
            trim: true,
        },
        phoneNumber: {
            type: String,
            required: true,
            trim: true,
        },
        label: {
            type: String,
            enum: ADDRESS_LABELS,
            default: DEFAULT_ADDRESS_LABEL,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export const AddressModel = model<TAddress>("address", AddressSchema);
