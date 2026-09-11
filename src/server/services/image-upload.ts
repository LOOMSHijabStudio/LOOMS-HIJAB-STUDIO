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
 *
 * Allowed:
 * - JPG
 * - JPEG
 * - PNG
 * - WEBP
 * - GIF
 *
 * Other files such as:
 * - PDF
 * - DOC
 * - DOCX
 * - XLS
 * - XLSX
 * - ZIP
 * - RAR
 * - MP4
 * - MOV
 * - SVG
 * - EXE
 *
 * will be rejected.
 */
export async function validateImageFile(
  file: File
): Promise<
  | { valid: true; mimeType: string }
  | { valid: false; error: string }
> {
  // =====================================================
  // CHECK FILE SIZE
  // =====================================================

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${
        MAX_FILE_SIZE / 1024 / 1024
      }MB`,
    };
  }

  // =====================================================
  // CHECK MIME TYPE
  // =====================================================
  //
  // file.type bertipe string.
  //
  // ALLOWED_IMAGE_TYPES adalah readonly array
  // dengan literal type.
  //
  // Karena itu kita cast menjadi readonly string[]
  // agar TypeScript tidak error pada .includes().
  //

  if (
    !(ALLOWED_IMAGE_TYPES as readonly string[]).includes(
      file.type
    )
  ) {
    return {
      valid: false,
      error:
        "Invalid file type. Only JPG, JPEG, PNG, WebP, and GIF are allowed.",
    };
  }

  // =====================================================
  // CHECK FILE EXTENSION
  // =====================================================

  const fileName = file.name.toLowerCase();

  const extension = fileName.split(".").pop();

  if (
    !extension ||
    !(
      ALLOWED_IMAGE_EXTENSIONS as readonly string[]
    ).includes(extension)
  ) {
    return {
      valid: false,
      error:
        "Invalid file extension. Only JPG, JPEG, PNG, WebP, and GIF are allowed.",
    };
  }

  // =====================================================
  // READ FILE SIGNATURE / MAGIC BYTES
  // =====================================================

  const buffer = await file.arrayBuffer();

  const uint8arr = new Uint8Array(buffer);

  // =====================================================
  // JPEG
  // =====================================================

  const isJpeg =
    uint8arr.length >= 2 &&
    uint8arr[0] === 0xff &&
    uint8arr[1] === 0xd8;

  // =====================================================
  // PNG
  // =====================================================

  const isPng =
    uint8arr.length >= 8 &&
    uint8arr[0] === 0x89 &&
    uint8arr[1] === 0x50 &&
    uint8arr[2] === 0x4e &&
    uint8arr[3] === 0x47 &&
    uint8arr[4] === 0x0d &&
    uint8arr[5] === 0x0a &&
    uint8arr[6] === 0x1a &&
    uint8arr[7] === 0x0a;

  // =====================================================
  // WEBP
  // =====================================================

  const isWebp =
    uint8arr.length >= 12 &&
    uint8arr[0] === 0x52 && // R
    uint8arr[1] === 0x49 && // I
    uint8arr[2] === 0x46 && // F
    uint8arr[3] === 0x46 && // F
    uint8arr[8] === 0x57 && // W
    uint8arr[9] === 0x45 && // E
    uint8arr[10] === 0x42 && // B
    uint8arr[11] === 0x50; // P

  // =====================================================
  // GIF
  // =====================================================
  //
  // GIF memiliki signature:
  //
  // GIF87a
  // GIF89a
  //
  // 6 byte pertama:
  //
  // G I F 8 7 a
  // atau
  // G I F 8 9 a
  //
  // Kita cek keenam byte tersebut.
  //

  const isGif =
    uint8arr.length >= 6 &&
    uint8arr[0] === 0x47 && // G
    uint8arr[1] === 0x49 && // I
    uint8arr[2] === 0x46 && // F
    uint8arr[3] === 0x38 && // 8
    (uint8arr[4] === 0x37 ||
      uint8arr[4] === 0x39) &&
    uint8arr[5] === 0x61; // a

  // =====================================================
  // SIGNATURE MUST MATCH
  // =====================================================

  if (
    !isJpeg &&
    !isPng &&
    !isWebp &&
    !isGif
  ) {
    return {
      valid: false,
      error:
        "File signature does not match a valid JPG, PNG, WebP, or GIF image.",
    };
  }

  // =====================================================
  // MIME TYPE MUST MATCH REAL FILE
  // =====================================================

  if (
    file.type === "image/jpeg" &&
    !isJpeg
  ) {
    return {
      valid: false,
      error:
        "The uploaded file is not a valid JPEG image.",
    };
  }

  if (
    file.type === "image/png" &&
    !isPng
  ) {
    return {
      valid: false,
      error:
        "The uploaded file is not a valid PNG image.",
    };
  }

  if (
    file.type === "image/webp" &&
    !isWebp
  ) {
    return {
      valid: false,
      error:
        "The uploaded file is not a valid WebP image.",
    };
  }

  if (
    file.type === "image/gif" &&
    !isGif
  ) {
    return {
      valid: false,
      error:
        "The uploaded file is not a valid GIF image.",
    };
  }

  // =====================================================
  // SUCCESS
  // =====================================================

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
  // =====================================================
  // EXTRACT EXTENSION SAFELY
  // =====================================================

  const extension =
    originalFileName
      .toLowerCase()
      .split(".")
      .pop() || "jpg";

  // =====================================================
  // GENERATE RANDOM FILENAME
  // =====================================================

  const randomId = crypto.randomUUID();

  const timestamp = Date.now();

  const safeFileName =
    `${timestamp}-${randomId}.${extension}`;

  // =====================================================
  // STORE IN PRODUCT DIRECTORY
  // =====================================================

  return `products/${productId}/images/${safeFileName}`;
}

/**
 * Check if image has valid SVG
 *
 * SVG is intentionally rejected because SVG can contain
 * scripts and can create XSS/security problems.
 */
export async function isMaliciousSVG(
  file: File
): Promise<boolean> {
  // =====================================================
  // SVG IS NOT ALLOWED
  // =====================================================

  if (
    file.type === "image/svg+xml" ||
    file.name
      .toLowerCase()
      .endsWith(".svg")
  ) {
    return true;
  }

  return false;
}

/**
 * Extract image dimensions from file
 */
export async function getImageDimensions(
  _buffer: ArrayBuffer
): Promise<{
  width: number;
  height: number;
} | null> {
  void _buffer;

  // =====================================================
  // CURRENT IMPLEMENTATION
  // =====================================================
  //
  // This function is intentionally kept unchanged
  // from the existing implementation.
  //
  // If image dimensions are needed later,
  // we can add a dedicated image parser.
  //

  return null;
}
