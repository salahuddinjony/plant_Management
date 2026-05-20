import { Request, Response } from "express";
import httpStatus from "http-status";
import { FOLDER_NAMES } from "../../constants/folder.constants";
import catchAsync from "../../utils/catchAsync";
import { uploadImage } from "../../utils/imageUpload";
import sendResponse from "../../utils/sendResponse";
import { TFlashSale } from "./flash-sale.interface";
import { flashSaleService } from "./flash-sale.service";

/**
 * @description Create a new flash sale
 * @param req - The request object
 * @param res - The response object
 * @returns The created flash sale
 */
const createFlashSaleController = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new Error("imageFile is required");
    }

    if (!(req.file.buffer instanceof Buffer)) {
        throw new Error("Invalid file format");
    }

    const uploadResult = await uploadImage(
        req.file.buffer,
        FOLDER_NAMES.FLASHSALE
    );

    const flashSaleData = {
        ...req.body,
        image: uploadResult.url,
    } as TFlashSale;

    const result = await flashSaleService.createFlashSaleService(flashSaleData);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Flash sale created successfully",
        data: result,
    });
});

/**
 * @description Get a flash sale by ID
 * @param req - The request object
 * @param res - The response object
 * @returns The flash sale with the specified ID
 */
const getFlashSaleByIdController = catchAsync(
    async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const result = await flashSaleService.getFlashSaleByIdService(id);

        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Flash sale retrieved successfully",
            data: result,
        });
    }
);

/**
 * @description Get all flash sales
 * @param req - The request object
 * @param res - The response object
 * @returns All flash sales
 */
const getAllFlashSalesController = catchAsync(
    async (req: Request, res: Response) => {
        const result = await flashSaleService.getAllFlashSalesService(req.query);

        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Flash sales retrieved successfully",
            data: result.flashSales,
            meta: result.meta,
        });
    }
);

/**
 * @description Get all active flash sales
 * @param req - The request object
 * @param res - The response object
 * @returns All active flash sales
 */
const getActiveFlashSalesController = catchAsync(
    async (req: Request, res: Response) => {
        const result = await flashSaleService.getActiveFlashSalesService(req.query);

        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Active flash sales retrieved successfully",
            data: result.flashSales,
            meta: result.meta,
        });
    }
);

/**
 * @description Get all featured flash sales
 * @param req - The request object
 * @param res - The response object
 * @returns All featured flash sales
 */
const getFeaturedFlashSalesController = catchAsync(
    async (req: Request, res: Response) => {
        const result = await flashSaleService.getFeaturedFlashSalesService(req.query);

        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Featured flash sales retrieved successfully",
            data: result.flashSales,
            meta: result.meta,
        });
    }
);

/**
 * @description Update a flash sale by ID
 * @param req - The request object
 * @param res - The response object
 * @returns The updated flash sale
 */
const updateFlashSaleController = catchAsync(
    async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const { title, description, discountType, discountValue, startDate, endDate, isActive, productIds, featured, order } = req.body;

        const updateData: Partial<TFlashSale> & { file?: Express.Multer.File } = {
            ...(title && { title }),
            ...(description && { description }),
            ...(discountType && { discountType }),
            ...(discountValue !== undefined && { discountValue: Number(discountValue) }),
            ...(startDate && { startDate: new Date(startDate) }),
            ...(endDate && { endDate: new Date(endDate) }),
            ...(isActive !== undefined && { isActive: isActive === "true" || isActive === true }),
            ...(productIds && { productIds: Array.isArray(productIds) ? productIds : [productIds] }),
            ...(featured !== undefined && { featured: featured === "true" || featured === true }),
            ...(order !== undefined && { order: Number(order) }),
        };

        if (req.file) {
            updateData.file = req.file;
        }

        const result = await flashSaleService.updateFlashSaleService(id, updateData);

        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Flash sale updated successfully",
            data: result,
        });
    }
);

/**
 * @description Delete a flash sale by ID
 * @param req - The request object
 * @param res - The response object
 * @returns The deleted flash sale
 */
const deleteFlashSaleController = catchAsync(
    async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const result = await flashSaleService.deleteFlashSaleService(id);

        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Flash sale deleted successfully",
            data: result,
        });
    }
);

export const flashSaleController = {
    createFlashSaleController,
    getFlashSaleByIdController,
    getAllFlashSalesController,
    getActiveFlashSalesController,
    getFeaturedFlashSalesController,
    updateFlashSaleController,
    deleteFlashSaleController,
};
