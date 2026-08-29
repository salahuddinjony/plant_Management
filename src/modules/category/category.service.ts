import httpStatus from "http-status";
import QueryBuilder from "../../builder/QueryBuilder";
import { FOLDER_NAMES } from "../../constants/folder.constants";
import AppError from "../../errors/AppError";
import { deleteImage, uploadImage } from "../../utils/imageUpload";
import { ProductModel } from "../products/products.model";
import { TCategory } from "./category.interface";
import { CategoryModel } from "./category.model";

const createCategoryService = async (categoryData: TCategory) => {
    const result = await CategoryModel.create(categoryData);

    if (!result && categoryData.image) {
        try {
            await deleteImage(categoryData.image);
        } catch (error) {
            console.error("Failed to cleanup category image:", error);
        }
        throw new Error("Failed to create category");
    }

    return result;
};

const getCategoryByIdService = async (id: string) => {
    return await CategoryModel.findById(id);
};

const getAllCategoriesService = async (query: Record<string, unknown>) => {
    const categoryQuery = new QueryBuilder(CategoryModel.find({}), query)
        .search(["title"])
        .filter()
        .sort()
        .paginate()
        .fields();
    const categories = await categoryQuery.modelQuery;
    const meta = await categoryQuery.countTotal();
    return { categories, meta };
};

const updateCategoryService = async (
    id: string,
    categoryData: Partial<TCategory> & { file?: Express.Multer.File }
) => {
    const session = await CategoryModel.startSession();
    session.startTransaction();

    try {
        const existingCategory = await CategoryModel.findById(id).session(session);

        if (!existingCategory) {
            throw new Error("Category not found");
        }

        let imageUrl = existingCategory.image;

        if (categoryData.file) {
            if (existingCategory.image) {
                try {
                    await deleteImage(existingCategory.image);
                } catch (error) {
                    console.error("Failed to delete old category image:", error);
                }
            }

            const uploadResult = await uploadImage(
                categoryData.file.buffer,
                FOLDER_NAMES.CATEGORY
            );
            imageUrl = uploadResult.url;
            delete categoryData.file;
        }

        const updatedCategory = await CategoryModel.findByIdAndUpdate(
            id,
            { ...categoryData, image: imageUrl },
            { new: true, session }
        );

        await session.commitTransaction();
        return updatedCategory;
    } catch (error) {
        await session.abortTransaction();
        console.error("Failed to update category:", error);
        throw error;
    } finally {
        session.endSession();
    }
};

const deleteCategoryService = async (id: string) => {
    const session = await CategoryModel.startSession();
    session.startTransaction();

    try {
        const category = await CategoryModel.findById(id).session(session);

        if (!category) {
            throw new AppError(httpStatus.NOT_FOUND, "Category not found");
        }

        // Check if any products are using this category
        const productsWithCategory = await ProductModel.countDocuments({
            $or: [{ categoryIds: id }, { categoryId: id }],
        }).session(session);

        if (productsWithCategory > 0) {
            throw new AppError(
                httpStatus.BAD_REQUEST,
                `Cannot delete category. ${productsWithCategory} product(s) are associated with this category. Please reassign or delete the products first.`
            );
        }

        const result = await CategoryModel.findByIdAndDelete(id).session(session);

        if (result && category.image) {
            const deleteResult = await deleteImage(category.image);
            if (!deleteResult || deleteResult.result !== "ok") {
                throw new Error("Failed to verify image deletion from Cloudinary");
            }
        }

        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        console.error("Failed to delete category:", error);
        throw error;
    } finally {
        session.endSession();
    }
};

export const categoryService = {
    createCategoryService,
    getCategoryByIdService,
    getAllCategoriesService,
    updateCategoryService,
    deleteCategoryService,
};
