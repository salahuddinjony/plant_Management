import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import config from "../config";

interface UploadResult {
  url: string;
  public_id: string;
  duration?: number;
  format?: string;
}

export interface File {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Configure Cloudinary with environment variables
 */
cloudinary.config({
  cloud_name: config.cloudinary_cloud_name,
  api_key: config.cloudinary_api_key,
  api_secret: config.cloudinary_api_secret,
});

/**
 * Uploads a video file to Cloudinary
 * @param file - The file buffer or readable stream to upload
 * @param folder - Optional folder to store the video in Cloudinary
 * @returns Promise with upload result containing URL, public_id, duration, and format
 */
export const uploadVideo = async (
  file: Buffer | Readable,
  folder?: string,
): Promise<UploadResult> => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder ? `nursery-app/${folder}` : "nursery-app/videos",
          resource_type: "video",
          chunk_size: 6000000, // 6MB chunks for better large video handling
          eager: [
            { width: 300, height: 300, crop: "pad", audio_codec: "none" },
            {
              width: 160,
              height: 100,
              crop: "crop",
              gravity: "south",
              audio_codec: "none",
            },
          ], // Generate thumbnails
          eager_async: true,
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          if (!result) {
            return reject(new Error("Video upload failed"));
          }

          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            duration: result.duration, // Video duration in seconds
            format: result.format, // Video format (mp4, mov, etc.)
          });
        },
      );

      if (Buffer.isBuffer(file)) {
        const readable = new Readable();
        readable.push(file);
        readable.push(null);
        readable.pipe(uploadStream);
      } else {
        file.pipe(uploadStream);
      }
    });
  } catch (error) {
    throw new Error(
      `Failed to upload video: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

/**
 * Deletes a video from Cloudinary using its public ID or URL
 * @param videoIdentifier - The public ID or URL of the video to delete
 * @returns Promise that resolves with Cloudinary deletion result
 */
export const deleteVideo = async (
  videoIdentifier: string,
): Promise<{ result: string }> => {
  try {
    const publicId = getPublicIdFromUrl(videoIdentifier);

    if (!publicId) {
      throw new Error("Invalid video identifier");
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "video", // Must specify for videos
      invalidate: true,
    });
    return result;
  } catch (error) {
    console.error("Error deleting video from Cloudinary:", error);
    throw error;
  }
};

/**
 * Extracts public_id from a Cloudinary URL
 * @param url - The Cloudinary URL
 * @returns The public_id or null if not a Cloudinary URL
 */
export const getPublicIdFromUrl = (url: string): string | null => {
  const matches = url.match(/upload\/v\d+\/(.+?)(\.\w+)?$/);
  return matches ? matches[1] : null;
};

/**
 * Gets video information from Cloudinary
 * @param publicId - The public ID of the video
 * @returns Promise with video information
 */
export const getVideoInfo = async (publicId: string): Promise<any> => {
  try {
    return await cloudinary.api.resource(publicId, {
      resource_type: "video",
    });
  } catch (error) {
    throw new Error(
      `Failed to get video info: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

/**
 * Generates a signed URL for private videos
 * @param publicId - The public ID of the video
 * @param expiration - URL expiration time in seconds (default 1 hour)
 * @returns Signed URL
 */
export const getSignedVideoUrl = (
  publicId: string,
  expiration: number = 3600,
): string => {
  return cloudinary.url(publicId, {
    resource_type: "video",
    sign_url: true,
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + expiration,
  });
};
