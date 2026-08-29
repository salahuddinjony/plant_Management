import QueryBuilder from "../../builder/QueryBuilder";
import { FOLDER_NAMES } from "../../constants/folder.constants";
import { deleteImage, uploadImage } from "../../utils/imageUpload";
import { TFlashSale } from "./flash-sale.interface";
import { FlashSaleModel } from "./flash-sale.model";

// searchTerm matches only the flash-sale title.
const FLASH_SALE_SEARCH_FIELDS = ["title"];

const applyDefaultFlashSaleSort = (
    query: Record<string, unknown>,
    modelQuery: ReturnType<typeof FlashSaleModel.find>
) => {
    if (!query.sortBy && !query.sort) {
        return modelQuery.sort({ order: 1, startDate: -1 });
    }
    return modelQuery;
};

const listFlashSales = async (
    baseFilter: Record<string, unknown>,
    query: Record<string, unknown> = {}
) => {
    const flashSaleQuery = new QueryBuilder(FlashSaleModel.find(baseFilter), query)
        .search(FLASH_SALE_SEARCH_FIELDS)
        .filter()
        .sort()
        .paginate()
        .fields();

    const sortedQuery = applyDefaultFlashSaleSort(query, flashSaleQuery.modelQuery);
    const flashSales = await sortedQuery.populate("productIds");
    const meta = await flashSaleQuery.countTotal();
    return { flashSales, meta };
};

/**
 * Creates a new flash sale.
 * @param flashSaleData - The flash sale data to create.
 * @returns The created flash sale.
 */
const createFlashSaleService = async (flashSaleData: TFlashSale) => {
    const result = await FlashSaleModel.create(flashSaleData);

    if (!result && flashSaleData.image) {
        try {
            await deleteImage(flashSaleData.image);
        } catch (error) {
            console.error("Failed to cleanup flash sale image:", error);
        }
        throw new Error("Failed to create flash sale");
    }

    return result;
};

/**
 * Gets a flash sale by ID.
 * @param id - The ID of the flash sale to get.
 * @returns The flash sale with the specified ID.
 */
const getFlashSaleByIdService = async (id: string) => {
    return await FlashSaleModel.findById(id).populate("productIds");
};

/**
 * Gets all flash sales (supports searchTerm on title).
 */
const getAllFlashSalesService = async (query: Record<string, unknown> = {}) => {
    return listFlashSales({}, query);
};

/**
 * Gets active flash sales.
 * @returns Active flash sales.
 */
const getActiveFlashSalesService = async (query: Record<string, unknown> = {}) => {
    const now = new Date();
    return listFlashSales(
        {
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
        },
        query
    );
};

/**
 * Gets featured flash sales.
 * @returns Featured flash sales.
 */
const getFeaturedFlashSalesService = async (query: Record<string, unknown> = {}) => {
    const now = new Date();
    return listFlashSales(
        {
            isActive: true,
            featured: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
        },
        query
    );
};

/**
 * Updates a flash sale.
 * @param id - The ID of the flash sale to update.
 * @param flashSaleData - The flash sale data to update.
 * @returns The updated flash sale.
 */
const updateFlashSaleService = async (
    id: string,
    flashSaleData: Partial<TFlashSale> & { file?: Express.Multer.File }
) => {
    const session = await FlashSaleModel.startSession();
    session.startTransaction();

    try {
        const existingFlashSale = await FlashSaleModel.findById(id).session(session);

        if (!existingFlashSale) {
            throw new Error("Flash sale not found");
        }

        let imageUrl = existingFlashSale.image;

        if (flashSaleData.file) {
            if (existingFlashSale.image) {
                try {
                    await deleteImage(existingFlashSale.image);
                } catch (error) {
                    console.error("Failed to delete old flash sale image:", error);
                }
            }

            const uploadResult = await uploadImage(
                flashSaleData.file.buffer,
                FOLDER_NAMES.FLASHSALE
            );
            imageUrl = uploadResult.url;
            delete flashSaleData.file;
        }

        const updatedFlashSale = await FlashSaleModel.findByIdAndUpdate(
            id,
            { ...flashSaleData, image: imageUrl },
            { new: true, session }
        ).populate("productIds");

        await session.commitTransaction();
        return updatedFlashSale;
    } catch (error) {
        await session.abortTransaction();
        console.error("Failed to update flash sale:", error);
        throw error;
    } finally {
        session.endSession();
    }
};

/**
 * Deletes a flash sale.
 * @param id - The ID of the flash sale to delete.
 * @returns The deleted flash sale.
 */
const deleteFlashSaleService = async (id: string) => {
    const session = await FlashSaleModel.startSession();
    session.startTransaction();

    try {
        const flashSale = await FlashSaleModel.findById(id).session(session);

        if (!flashSale) {
            throw new Error("Flash sale not found");
        }

        const result = await FlashSaleModel.findByIdAndDelete(id).session(session);

        if (result && flashSale.image) {
            const deleteResult = await deleteImage(flashSale.image);
            if (!deleteResult || deleteResult.result !== "ok") {
                throw new Error("Failed to verify image deletion from Cloudinary");
            }
        }

        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        console.error("Failed to delete flash sale:", error);
        throw error;
    } finally {
        session.endSession();
    }
};

export const flashSaleService = {
    createFlashSaleService,
    getFlashSaleByIdService,
    getAllFlashSalesService,
    getActiveFlashSalesService,
    getFeaturedFlashSalesService,
    updateFlashSaleService,
    deleteFlashSaleService,
};
