import { Request, Response } from "express";
import httpStatus from "http-status";
import { USER_ROLE } from "../../constants/status.constants";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { uploadProductImageFiles } from "./product-images.util";
import { TProduct } from "./products.interface";
import { formatProductResponse, formatProductsResponse } from "./product-response.util";
import { productService } from "./products.service";

/**
 * Create a new product
 * @param req - The request object
 * @param res - The response object
 */
const createProductController = catchAsync(async (req, res) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const imageUrls = await uploadProductImageFiles(files?.images);

    const productData = {
        ...req.body,
        images: imageUrls,
    } as TProduct;

    const result = await productService.createProductService(productData);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Product created successfully",
        data: formatProductResponse(result, USER_ROLE.ADMIN),
    });
});

/**
 * Get a product by ID
 * @param req - The request object
 * @param res - The response object
 */
const getProductByIdController = catchAsync(
    async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const result = await productService.getProductByIdService(id, req.user?.role);

        if (!result) {
            throw new AppError(httpStatus.NOT_FOUND, "Product not found");
        }

        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Product retrieved successfully",
            data: formatProductResponse(result, req.user?.role),
        });
    }
);

/**
 * Get all products
 * @param req - The request object
 * @param res - The response object
 */
const getAllProductsController = catchAsync(
    async (req: Request, res: Response) => {
        const result = await productService.getAllProductsService(req.query, req.user?.role);

        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Products retrieved successfully",
            data: formatProductsResponse(result.products, req.user?.role),
            meta: result.meta,
        });
    }
);

/**
 * Get products by tag name
 * @param req - The request object
 * @param res - The response object
 */
const getProductsByTagController = catchAsync(
    async (req: Request, res: Response) => {
        const { tags } = req.params;
        const result = await productService.getProductsByTagService(
            tags as string,
            req.query,
            req.user?.role
        );

        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Products retrieved successfully",
            data: formatProductsResponse(result.products, req.user?.role),
            meta: result.meta,
        });
    }
);

/**
 * Get all products by category id
 * @param req - The request object
 * @param res - The response object
 */
const getAllProductsByCategoryIdController = catchAsync(
    async (req: Request, res: Response) => {
        const { categoryId } = req.params;
        const result = await productService.getAllProductsByCategoryIdService(
            categoryId as string,
            req.query,
            req.user?.role
        );

        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Products retrieved successfully",
            data: formatProductsResponse(result.products, req.user?.role),
            meta: result.meta,
        });
    }
);

/**
 * Update a product by ID
 * @param req - The request object
 * @param res - The response object
 */
const updateProductController = catchAsync(
    async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const {
            name,
            description,
            price,
            isAvailable,
            discount,
            quantity,
            sold,
            isFeatured,
            sku,
            brand,
            categoryIds,
            categoryId,
            tags,
            deliveryTime,
            courierCharge,
            images,
        } = req.body;

        const updateData: Partial<TProduct> & {
            images?: string[] | string;
            file?: Express.Multer.File;
            files?: { [fieldname: string]: Express.Multer.File[] };
        } = {
            ...(name && { name }),
            ...(description && { description }),
            ...(price !== undefined && { price: Number(price) }),
            ...(discount !== undefined && { discount: Number(discount) }),
            ...(quantity !== undefined && { quantity: Number(quantity) }),
            ...(sold !== undefined && { sold: Number(sold) }),
            ...(isAvailable !== undefined && { isAvailable: isAvailable === "true" || isAvailable === true }),
            ...(isFeatured !== undefined && { isFeatured: isFeatured === "true" || isFeatured === true }),
            ...(sku && { sku }),
            ...(brand && { brand }),
            ...(categoryIds !== undefined && { categoryIds }),
            ...(categoryId !== undefined && { categoryId }),
            ...(tags && { tags: Array.isArray(tags) ? tags : [tags] }),
            ...(deliveryTime && { deliveryTime }),
            ...(courierCharge !== undefined && { courierCharge: Number(courierCharge) }),
            ...(images !== undefined && { images }),
        };

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (files) {
            updateData.files = files;
        }

        const result = await productService.updateProductService(id, updateData);

        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Product updated successfully",
            data: formatProductResponse(result, USER_ROLE.ADMIN),
        });
    }
);

/**
 * Delete a product by ID
 * @param req - The request object
 * @param res - The response object
 */
const deleteProductController = catchAsync(
    async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const result = await productService.deleteProductService(id);

        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Product deleted successfully",
            data: formatProductResponse(result, USER_ROLE.ADMIN),
        });
    }
);

export const productController = {
    createProductController,
    getProductByIdController,
    getAllProductsController,
    getProductsByTagController,
    getAllProductsByCategoryIdController,
    updateProductController,
    deleteProductController,
};
