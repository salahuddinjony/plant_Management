import mongoose from "mongoose";
import config from "../config";
import { ProductModel } from "../modules/products/products.model";

/**
 * One-time migration:
 *   categoryId -> categoryIds[]
 *
 * Run with:
 *   npx ts-node src/DB/migrateProductCategories.ts
 */
const migrateProductCategories = async () => {
    if (!config.MONGO_URI) {
        throw new Error("MONGO_URI is not configured");
    }

    await mongoose.connect(config.MONGO_URI);

    const products = await ProductModel.find({
        categoryId: { $exists: true, $ne: null },
    }).select("_id categoryId categoryIds");

    let migrated = 0;

    for (const product of products) {
        const legacyCategoryId = product.categoryId?.toString();
        if (!legacyCategoryId) continue;

        const categoryIds = (product.categoryIds ?? []).map(String);
        if (!categoryIds.includes(legacyCategoryId)) {
            categoryIds.push(legacyCategoryId);
        }

        await ProductModel.updateOne(
            { _id: product._id },
            {
                $set: { categoryIds },
                $unset: { categoryId: "" },
            }
        );
        migrated += 1;
    }

    console.log(`Migrated ${migrated} product(s) to categoryIds.`);
    await mongoose.disconnect();
};

migrateProductCategories().catch(async (error) => {
    console.error("Product category migration failed:", error);
    await mongoose.disconnect();
    process.exitCode = 1;
});
