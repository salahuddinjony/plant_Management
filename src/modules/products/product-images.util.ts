import { FOLDER_NAMES } from "../../constants/folder.constants";
import AppError from "../../errors/AppError";
import { deleteImage, uploadImage } from "../../utils/imageUpload";

export const MAX_PRODUCT_IMAGES = 5;

export const uploadProductImageFiles = async (
    files: Express.Multer.File[] | undefined
): Promise<string[]> => {
    if (!files?.length) {
        throw new AppError(400, "At least one image is required in the images field");
    }

    const urls: string[] = [];
    for (const file of files) {
        const uploadResult = await uploadImage(file.buffer, FOLDER_NAMES.PRODUCT);
        urls.push(uploadResult.url);
    }

    return urls;
};

/** All image URLs for a product (supports legacy docs that only had `image`). */
export const collectProductImageUrls = (product: {
    image?: string;
    images?: string[];
}): string[] => {
    if (product.images?.length) {
        return [...new Set(product.images.filter(Boolean))];
    }
    if (product.image) {
        return [product.image];
    }
    return [];
};

/** Parse `images` from multipart/JSON body (URL, JSON array string, or array). */
export const parseProductImagesFromBody = (images: unknown): string[] | undefined => {
    if (images === undefined || images === null) return undefined;
    if (Array.isArray(images)) {
        const urls = images.map((u) => String(u).trim()).filter(Boolean);
        return urls.length ? [...new Set(urls)] : [];
    }
    if (typeof images === "string") {
        const trimmed = images.trim();
        if (!trimmed) return undefined;
        if (trimmed.startsWith("[")) {
            try {
                const parsed = JSON.parse(trimmed) as unknown;
                if (Array.isArray(parsed)) {
                    const urls = parsed.map((u) => String(u).trim()).filter(Boolean);
                    return urls.length ? [...new Set(urls)] : [];
                }
            } catch {
                // single URL below
            }
        }
        return [trimmed];
    }
    return undefined;
};

/**
 * Merge images on update: append new uploads by default; optional body `images` = URLs to keep.
 * Only deletes from storage URLs removed from the final list.
 */
export const resolveProductImagesOnUpdate = async ({
    existingUrls,
    keptUrlsFromBody,
    newFiles,
}: {
    existingUrls: string[];
    keptUrlsFromBody?: string[];
    newFiles?: Express.Multer.File[];
}): Promise<{ finalUrls: string[]; urlsToDelete: string[]; imagesChanged: boolean }> => {
    const newUploaded = newFiles?.length ? await uploadProductImageFiles(newFiles) : [];

    let finalUrls: string[];
    let imagesChanged = false;

    if (keptUrlsFromBody !== undefined) {
        finalUrls = [...keptUrlsFromBody, ...newUploaded];
        imagesChanged = true;
    } else if (newUploaded.length > 0) {
        finalUrls = [...existingUrls, ...newUploaded];
        imagesChanged = true;
    } else {
        return { finalUrls: existingUrls, urlsToDelete: [], imagesChanged: false };
    }

    finalUrls = [...new Set(finalUrls.filter(Boolean))];

    if (finalUrls.length > MAX_PRODUCT_IMAGES) {
        throw new AppError(400, `A product can have at most ${MAX_PRODUCT_IMAGES} images`);
    }
    if (finalUrls.length === 0) {
        throw new AppError(400, "At least one product image is required");
    }

    const urlsToDelete = existingUrls.filter((url) => !finalUrls.includes(url));
    return { finalUrls, urlsToDelete, imagesChanged };
};

export const deleteProductImagesFromStorage = async (urls: string[]) => {
    for (const url of urls) {
        try {
            await deleteImage(url);
        } catch (error) {
            console.error("Failed to delete product image:", url, error);
        }
    }
};
