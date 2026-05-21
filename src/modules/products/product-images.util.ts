import { FOLDER_NAMES } from "../../constants/folder.constants";
import AppError from "../../errors/AppError";
import { uploadImage } from "../../utils/imageUpload";

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
