import QueryBuilder from "../../builder/QueryBuilder";
import { FOLDER_NAMES } from "../../constants/folder.constants";
import { deleteImage, uploadImage } from "../../utils/imageUpload";
import { CartModel } from "../cart/cart.model";
import { FlashSaleModel } from "../flash-sale/flash-sale.model";
import { OrderModel } from "../order/order.model";
import { ReviewModel } from "../review/review.model";
import { PRODUCT_REVIEWS_POPULATE, syncProductReviewIds } from "../review/review.service";
import { WishlistModel } from "../wishlist/wishlist.model";
import { TProduct } from "./products.interface";
import { ProductModel } from "./products.model";

const PRODUCT_SEARCH_FIELDS = ["name", "description", "brand", "sku", "tags"];
const PRODUCT_SEARCH_ARRAY_FIELDS = ["tags"];

/**
 * Create a new product
 * @param productData - The product data to create
 * @returns The created product
 */
const createProductService = async (productData: TProduct) => {
    // tags normalization to lowercase and coma separation
    if (productData.tags && !Array.isArray(productData.tags)) {
        productData.tags = (productData.tags as string)
            .split(",")
            .map((tag: string) => tag.trim().toLowerCase());
    }
    const result = await ProductModel.create(productData);

    if (!result && productData.image) {
        try {
            await deleteImage(productData.image);
        } catch (error) {
            console.error("Failed to cleanup product image:", error);
        }
        throw new Error("Failed to create product");
    }

    return result;
};

/**
 * Get a product by ID
 * @param id - The ID of the product to retrieve
 * @returns The product with the specified ID
 */
const getProductByIdService = async (id: string) => {
    const product = await ProductModel.findById(id);
    if (!product) {
        return null;
    }

    if (!product.reviews?.length) {
        const reviewCount = await ReviewModel.countDocuments({ productId: id });
        if (reviewCount > 0) {
            await syncProductReviewIds(id);
        }
    }

    return ProductModel.findById(id).populate(PRODUCT_REVIEWS_POPULATE);
};

const withPopulatedReviews = <T extends { populate: (arg: typeof PRODUCT_REVIEWS_POPULATE) => T }>(
    query: T
) => query.populate(PRODUCT_REVIEWS_POPULATE);

/**
 * Get all products
 * @param query - The query parameters to filter, sort, and paginate the results
 * @queries: {searchTerm: string, brand: string, tags: string, price: string, rating: string, stock: string}
 * @returns An object containing the products and pagination metadata
 */
const getAllProductsService = async (query: Record<string, unknown>) => {

    const productQuery = new QueryBuilder(ProductModel.find({}), query)
        .search(PRODUCT_SEARCH_FIELDS, PRODUCT_SEARCH_ARRAY_FIELDS)
        .filter()
        .sort()
        .paginate()
        .fields();
    const products = await withPopulatedReviews(productQuery.modelQuery);
    const meta = await productQuery.countTotal();
    return { products, meta };
};

/**
 * Get products by tag name
 * @param tags - The tag name to filter products by
 * @param query - The query parameters to filter, sort, and paginate the results
 * @returns An object containing the products and pagination metadata
 */
const getProductsByTagService = async (tags: string, query: Record<string, unknown> = {}) => {
    // Split tags by comma, trim whitespace, and create case-insensitive regex for each
    const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const tagsRegexArray = tagArray.map(t => new RegExp(`^${t}$`, 'i'));

    // Create base query with tag filtering
    const productQuery = new QueryBuilder(
        ProductModel.find({
            tags: {
                $in: tagsRegexArray
            }
        }),
        query
    )
        .search(PRODUCT_SEARCH_FIELDS, PRODUCT_SEARCH_ARRAY_FIELDS)
        .filter()
        .sort()
        .paginate()
        .fields();

    const products = await withPopulatedReviews(productQuery.modelQuery);
    const meta = await productQuery.countTotal();

    return { products, meta };
};

/**
 * Get all products by category id
 * @param categoryId - The ID of the category to retrieve products from
 * @returns An object containing the products and pagination metadata
 */
const getAllProductsByCategoryIdService = async (categoryId: string, query: Record<string, unknown> = {}) => {
    const productQuery = new QueryBuilder(ProductModel.find({ categoryId }), query)
        .search(PRODUCT_SEARCH_FIELDS, PRODUCT_SEARCH_ARRAY_FIELDS)
        .filter()
        .sort()
        .paginate()
        .fields();
    const products = await withPopulatedReviews(productQuery.modelQuery);
    const meta = await productQuery.countTotal();
    return { products, meta };
};

/**
 * Update a product by ID
 * @param id - The ID of the product to update
 * @param productData - The product data to update
 * @returns The updated product
 */
const updateProductService = async (
    id: string,
    productData: Partial<TProduct> & {
        file?: Express.Multer.File;
        files?: { [fieldname: string]: Express.Multer.File[] };
    }
) => {
    const session = await ProductModel.startSession();
    session.startTransaction();

    try {
        const existingProduct = await ProductModel.findById(id).session(session);

        if (!existingProduct) {
            throw new Error("Product not found");
        }

        let imageUrl = existingProduct.image;
        let imagesUrls = existingProduct.images || [];

        // Handle multiple file uploads
        if (productData.files) {
            const files = productData.files;

            // Handle main image update
            if (files.image && files.image[0]) {
                if (existingProduct.image) {
                    try {
                        await deleteImage(existingProduct.image);
                    } catch (error) {
                        console.error("Failed to delete old product image:", error);
                    }
                }

                const uploadResult = await uploadImage(
                    files.image[0].buffer,
                    FOLDER_NAMES.PRODUCT
                );
                imageUrl = uploadResult.url;
            }

            // Handle additional images
            if (files.images) {
                // Delete old additional images if any
                if (existingProduct.images && existingProduct.images.length > 0) {
                    for (const oldImage of existingProduct.images) {
                        try {
                            await deleteImage(oldImage);
                        } catch (error) {
                            console.error("Failed to delete old additional image:", error);
                        }
                    }
                }

                // Upload new additional images
                const newImagesUrls: string[] = [];
                for (const file of files.images) {
                    const uploadResult = await uploadImage(
                        file.buffer,
                        FOLDER_NAMES.PRODUCT
                    );
                    newImagesUrls.push(uploadResult.url);
                }
                imagesUrls = newImagesUrls;
            }

            delete productData.files;
        }

        const updatedProduct = await ProductModel.findByIdAndUpdate(
            id,
            { ...productData, image: imageUrl, images: imagesUrls },
            { new: true, session }
        );

        await session.commitTransaction();
        return updatedProduct;
    } catch (error) {
        await session.abortTransaction();
        console.error("Failed to update product:", error);
        throw error;
    } finally {
        session.endSession();
    }
};

/**
 * Delete a product by ID
 * @param id - The ID of the product to delete
 * @returns The deleted product
 */
const deleteProductService = async (id: string) => {
    const session = await ProductModel.startSession();
    session.startTransaction();

    try {
        const product = await ProductModel.findById(id).session(session);

        if (!product) {
            throw new Error("Product not found");
        }

        // Remove product from all carts
        const carts = await CartModel.find({ 'items.productId': id }).session(session);
        if (carts.length > 0) {
            for (const cartItem of carts) {
                const updatedCart = await CartModel.findByIdAndUpdate(
                    cartItem._id,
                    { $pull: { items: { productId: id } } },
                    { new: true, session }
                );


                // If cart is empty, remove it
                if (updatedCart && updatedCart.items.length === 0) {
                    await CartModel.findByIdAndDelete(cartItem._id).session(session);
                }
            }
        }

        // Remove product from all orders
        const orders = await OrderModel.find({ 'items.productId': id }).session(session);
        if (orders.length > 0) {
            for (const orderItem of orders) {
                const updatedOrder = await OrderModel.findByIdAndUpdate(
                    orderItem._id,
                    { $pull: { items: { productId: id } } },
                    { new: true, session }
                );

                // If order is empty, remove it
                if (updatedOrder && updatedOrder.items.length === 0) {
                    await OrderModel.findByIdAndDelete(orderItem._id).session(session);
                }
            }
        }

        // Remove product from all wishlists
        const wishlists = await WishlistModel.find({ productIds: { $in: [id] } }).session(session);
        if (wishlists.length > 0) {
            for (const wishlistItem of wishlists) {
                const updatedWishlist = await WishlistModel.findByIdAndUpdate(
                    wishlistItem._id,
                    { $pull: { productIds: id } },
                    { new: true, session }
                );

                // If wishlist is empty, remove it
                if (updatedWishlist && updatedWishlist.productIds.length === 0) {
                    await WishlistModel.findByIdAndDelete(wishlistItem._id).session(session);
                }
            }
        }

        // Remove all reviews for this product
        await ReviewModel.deleteMany({ productId: id }).session(session);


        // Remove product from all flash sales
        const flashSales = await FlashSaleModel.find({ productIds: { $in: [id] } }).session(session);
        if (flashSales.length > 0) {
            for (const flashSaleItem of flashSales) {
                await FlashSaleModel.findByIdAndUpdate(
                    flashSaleItem._id,
                    { $pull: { productIds: id } },
                    { session }
                );

            }
        }

        // Delete the product
        const result = await ProductModel.findByIdAndDelete(id).session(session);

        // Commit transaction before deleting images (external operation)
        await session.commitTransaction();

        // Delete images from Cloudinary (after transaction commit)
        if (result) {
            // Delete main image
            if (product.image) {
                try {
                    const deleteResult = await deleteImage(product.image);
                    if (!deleteResult || deleteResult.result !== "ok") {
                        console.error("Failed to delete main product image from Cloudinary");
                    }
                } catch (error) {
                    console.error("Failed to delete main product image:", error);
                }
            }

            // Delete additional images
            if (product.images && product.images.length > 0) {
                for (const imageUrl of product.images) {
                    try {
                        await deleteImage(imageUrl);
                    } catch (error) {
                        console.error("Failed to delete additional product image:", error);
                    }
                }
            }
        }

        return result;
    } catch (error) {
        await session.abortTransaction();
        console.error("Failed to delete product:", error);
        throw error;
    } finally {
        session.endSession();
    }
};

export const productService = {
    createProductService,
    getProductByIdService,
    getAllProductsService,
    getProductsByTagService,
    getAllProductsByCategoryIdService,
    updateProductService,
    deleteProductService,
};
