import { model, Schema } from "mongoose";
import { TProduct } from "./products.interface";

const ProductSchema = new Schema<TProduct>(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        sku: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },
        description: {
            type: String,
        },
        image: {
            type: String,
            required: true,
        },
        images: {
            type: [String],
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        discount: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
        },
        quantity: {
            type: Number,
            min: 0,
            default: 0,
        },
        isAvailable: {
            type: Boolean,
            default: true,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        brand: {
            type: String,
            trim: true,
        },
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: "category",
        },
        tags: {
            type: [String],
            default: [],
        },
        deliveryTime: {
            type: String,
            trim: true,
        },
        courierCharge: {
            type: Number,
            min: 0,
            default: 0,
        },
        ratingAverage: {
            type: Number,
            min: 0,
            max: 5,
            default: 0,
        },
        ratingCount: {
            type: Number,
            min: 0,
            default: 0,
        },
        reviews: {
            type: [{ type: Schema.Types.ObjectId, ref: "review" }],
            default: [],
        },
    },
    { timestamps: true }
);


// Post hook to handle E11000 duplicate key errors
ProductSchema.post("save", function (error: any, doc: any, next: any) {
    if (error.name === "MongoServerError" && error.code === 11000) {
        // Extract the field name causing the error
        const field = Object.keys(error.keyValue)[0];
        const value = error.keyValue[field];

        next(new Error(`A product with the ${field} "${value}" already exists.`));
    } else {
        next(error);
    }
});

// Also handle updates (findOneAndUpdate)
ProductSchema.post("findOneAndUpdate", function (error: any, doc: any, next: any) {
    if (error.name === "MongoServerError" && error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        next(new Error(`The ${field} you are trying to use is already taken.`));
    } else {
        next(error);
    }
});

export const ProductModel = model<TProduct>("product", ProductSchema);
