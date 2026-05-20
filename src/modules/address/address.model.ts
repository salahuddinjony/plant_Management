import { model, Schema } from "mongoose";
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
        phoneNumber: String,
        label: {
            type: String,
            enum: ["home", "office", "other"],
            default: "other",
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export const AddressModel = model<TAddress>("address", AddressSchema);
