import { model, Schema } from "mongoose";
import { PAYMENT_ACCOUNT_TYPES } from "./payment-method.constants";
import { TPaymentMethod } from "./payment-method.interface";

const PaymentMethodSchema = new Schema<TPaymentMethod>(
    {
        methodName: {
            type: String,
            required: true,
            trim: true,
            example: "bKash",
        },
        description: {
            type: String,
            trim: true,
        },
        accountNumber: {
            type: String,
            required: true,
            trim: true,
        },
        accountName: {
            type: String,
            required: true,
            trim: true,
        },
        accountType: {
            type: String,
            enum: PAYMENT_ACCOUNT_TYPES,
            required: true,
        },
        branchName: {
            type: String,
            trim: true,
        },
        instructions: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        displayOrder: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// Post hook to handle E11000 duplicate key errors
PaymentMethodSchema.post("save", function (error: any, doc: any, next: any) {
    if (error.name === "MongoServerError" && error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        const value = error.keyValue[field];
        next(new Error(`A payment method with the ${field} "${value}" already exists.`));
    } else {
        next(error);
    }
});

// Also handle updates (findOneAndUpdate)
PaymentMethodSchema.post("findOneAndUpdate", function (error: any, doc: any, next: any) {
    if (error.name === "MongoServerError" && error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        next(new Error(`The ${field} you are trying to use is already taken.`));
    } else {
        next(error);
    }
});

export const PaymentMethodModel = model<TPaymentMethod>("paymentMethod", PaymentMethodSchema);
