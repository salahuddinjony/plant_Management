export type TProduct = {
    name: string;
    description?: string;
    images: string[];
    price: number;
    discount?: number;
    available?: number;
    sold?: number;
    sku?: string;
    brand?: string;
    /** Categories assigned to this product. */
    categoryIds?: string[];
    /** @deprecated Kept temporarily so existing documents can be migrated safely. */
    categoryId?: string;
    tags?: string[];
    deliveryTime?: string;
    courierCharge?: number;
    isAvailable: boolean;
    isFeatured?: boolean;
    ratingAverage?: number;
    ratingCount?: number;
    reviews?: string[];
    createdAt: Date;
    updatedAt: Date;
};
