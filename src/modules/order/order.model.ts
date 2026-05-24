import { model, Schema } from "mongoose";
import { ADDRESS_LABELS, DEFAULT_ADDRESS_LABEL } from "../address/address.constants";
import { TOrder } from "./order.interface";

const OrderSchema = new Schema<TOrder>(
    {
        orderId: {
            type: String,
            required: true,
            unique: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
        items: [
            {
                productId: {
                    type: Schema.Types.ObjectId,
                    ref: "product",
                    required: true,
                },
                name: {
                    type: String,
                    required: true,
                },
                price: {
                    type: Number,
                    required: true,
                    min: 0,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                total: {
                    type: Number,
                    required: true,
                    min: 0,
                },
            },
        ],
        shippingAddress: {
            street: { type: String },
            city: { type: String, required: true },
            postalCode: { type: String },
            country: { type: String, required: true },
            phoneNumber: { type: String, required: true, trim: true },
            label: {
                type: String,
                enum: ADDRESS_LABELS,
                default: DEFAULT_ADDRESS_LABEL,
            },
        },
        billingAddress: {
            street: String,
            city: String,
            postalCode: String,
            country: String,
            phoneNumber: String,
            label: { type: String, enum: ADDRESS_LABELS },
        },
        orderStatus: {
            type: String,
            enum: ["pending", "processing", "delivered", "cancelled"],
            default: "pending",
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "completed", "failed"],
            default: "pending",
        },
        paymentMethod: String,
        transactionId: String,
        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
        tax: {
            type: Number,
            default: 0,
            min: 0,
        },
        shippingCost: {
            type: Number,
            default: 0,
            min: 0,
        },
        total: {
            type: Number,
            required: true,
            min: 0,
        },
        discountCode: String,
        discountAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        notes: String,
    },
    { timestamps: true }
);


// Post hook to handle E11000 duplicate key errors
OrderSchema.post("save", function (error: any, doc: any, next: any) {
    if (error.name === "MongoServerError" && error.code === 11000) {
        // Extract the field name causing the error
        const field = Object.keys(error.keyValue)[0];
        const value = error.keyValue[field];

        next(new Error(`An order with the ${field} "${value}" already exists.`));
    } else {
        next(error);
    }
});

// Also handle updates (findOneAndUpdate)
OrderSchema.post("findOneAndUpdate", function (error: any, doc: any, next: any) {
    if (error.name === "MongoServerError" && error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        next(new Error(`The ${field} you are trying to use is already taken.`));
    } else {
        next(error);
    }
});

export const OrderModel = model<TOrder>("order", OrderSchema);
