import "server-only";
import {
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
} from "@/server/validation/product";

export interface ImageUploadResult {
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
}

/**
 * Validate image file for security and requirements
 */
export async function validateImageFile(
  file: File
): Promise<{ valid: true; mimeType: string } | { valid: false; error: string }> {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Only JPEG, PNG, and WebP are allowed.",
    };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const extension = fileName.split(".").pop();
  if (!extension || !ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: "Invalid file extension",
    };
  }

  // Validate file signature (magic bytes)
  const buffer = await file.arrayBuffer();
  const uint8arr = new Uint8Array(buffer);

  const isJpeg = uint8arr[0] === 0xff && uint8arr[1] === 0xd8;
  const isPng =
    uint8arr[0] === 0x89 &&
    uint8arr[1] === 0x50 &&
    uint8arr[2] === 0x4e &&
    uint8arr[3] === 0x47;
  const isWebp =
    uint8arr[0] === 0x52 &&
    uint8arr[1] === 0x49 &&
    uint8arr[2] === 0x46 &&
    uint8arr[3] === 0x46;

  if (!isJpeg && !isPng && !isWebp) {
    return {
      valid: false,
      error: "File signature does not match claimed type",
    };
  }

  return {
    valid: true,
    mimeType: file.type,
  };
}

/**
 * Generate safe storage path for image
 */
export function generateImagePath(
  productId: string,
  originalFileName: string
): string {
  // Extract extension safely
  const extension = originalFileName
    .toLowerCase()
    .split(".")
    .pop() || "jpg";

  // Generate random filename to prevent path traversal and enumeration
  const randomId = crypto.randomUUID();
  const timestamp = Date.now();
  const safeFileName = `${timestamp}-${randomId}.${extension}`;

  // Store in product directory
  return `products/${productId}/images/${safeFileName}`;
}

/**
 * Check if image has valid SVG (detect malicious SVG)
 * This prevents XSS via SVG uploads
 */
export async function isMaliciousSVG(file: File): Promise<boolean> {
  // SVG files should be rejected from image uploads
  // This is a defense-in-depth measure
  if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
    return true;
  }

  return false;
}

/**
 * Extract image dimensions from file
 */
export async function getImageDimensions(
  _buffer: ArrayBuffer
): Promise<{ width: number; height: number } | null> {
  void _buffer;

  // This is a simplified version. In production, use a library like:
  // import imageSize from 'image-size'
  // For now, return null - actual implementation would parse image headers
  return null;
}
