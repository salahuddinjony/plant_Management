import { model, Schema } from "mongoose";
import { PURCHASE_DISCLAIMER_TYPES } from "./purchase-disclaimer.constants";
import { TPurchaseDisclaimer } from "./purchase-disclaimer.interface";

const PurchaseDisclaimerSchema = new Schema<TPurchaseDisclaimer>(
    {
        title: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: PURCHASE_DISCLAIMER_TYPES,
            required: true,
        },
        isActive: { type: Boolean, default: true },
        orderNumber: { type: Number, required: true, min: 1 },
    },
    { timestamps: true }
);

PurchaseDisclaimerSchema.index({ orderNumber: 1 }, { unique: true });

export const PurchaseDisclaimerModel = model<TPurchaseDisclaimer>(
    "purchase_disclaimer",
    PurchaseDisclaimerSchema
);
