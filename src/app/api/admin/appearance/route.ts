import { NextRequest, NextResponse } from "next/server";

import { verifyAdminRequest } from "@/server/auth/api-utils";

import {
  WebsiteAppearance,
  getWebsiteAppearance,
  updateWebsiteAppearance,
} from "@/server/store/appearance";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

import { logAuditEvent } from "@/server/auth/audit";

export const dynamic = "force-dynamic";

const IMAGE_CONFIG = {
  heroImage: {
    folder: "hero",
    label: "Hero Banner",
  },

  editorialImage: {
    folder: "editorial",
    label: "Banner Editorial",
  },
} as const;

type ImageField = keyof typeof IMAGE_CONFIG;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const ALLOWED_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
] as const;

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const appearanceKeys: Array<keyof WebsiteAppearance> = [
  "announcementText",
  "heroEyebrow",
  "heroTitle",
  "heroDescription",
  "heroImage",
  "editorialEyebrow",
  "editorialTitle",
  "editorialDescription",
  "editorialImage",
  "storyTitle",
  "storyDescription",
  "storyImage",
  "whatsappNumber",
];

function isImageField(value: string): value is ImageField {
  return value in IMAGE_CONFIG;
}

function getStoragePathFromUrl(
  url: string
): string | null {
  const marker =
    "/storage/v1/object/public/site-assets/";

  const index = url.indexOf(marker);

  if (index === -1) {
    return null;
  }

  return decodeURIComponent(
    url.slice(index + marker.length)
  );
}

function sanitizeAppearanceBody(
  body: unknown
): Partial<WebsiteAppearance> {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return {};
  }

  const input =
    body as Record<string, unknown>;

  const result: Partial<WebsiteAppearance> = {};

  for (const key of appearanceKeys) {
    const value = input[key];

    if (typeof value === "string") {
      result[key] = value;
    }
  }

  return result;
}

function getExtension(
  fileName: string
): string | null {
  const parts = fileName
    .toLowerCase()
    .split(".");

  if (parts.length < 2) {
    return null;
  }

  const extension =
    parts[parts.length - 1];

  if (
    !ALLOWED_IMAGE_EXTENSIONS.includes(
      extension as (typeof ALLOWED_IMAGE_EXTENSIONS)[number]
    )
  ) {
    return null;
  }

  return extension;
}

function getMimeTypeFromExtension(
  extension: string
): string {
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";

    case "png":
      return "image/png";

    case "webp":
      return "image/webp";

    case "gif":
      return "image/gif";

    default:
      return "";
  }
}

async function validateImageSignature(
  file: File
): Promise<boolean> {
  const buffer =
    await file.arrayBuffer();

  const bytes =
    new Uint8Array(buffer);

  // JPEG
  const isJpeg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;

  // PNG
  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;

  // WEBP
  const isWebp =
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  // GIF87a / GIF89a
  const isGif =
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 ||
      bytes[4] === 0x39) &&
    bytes[5] === 0x61;

  return (
    isJpeg ||
    isPng ||
    isWebp ||
    isGif
  );
}

export async function GET() {
  try {
    const verification =
      await verifyAdminRequest();

    if (!verification.success) {
      return verification.response;
    }

    const appearance =
      await getWebsiteAppearance();

    return NextResponse.json({
      success: true,
      appearance,
    });
  } catch (error) {
    console.error(
      "Get appearance error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Gagal mengambil data tampilan website",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const verification =
      await verifyAdminRequest();

    if (!verification.success) {
      return verification.response;
    }

    const contentType =
      request.headers.get(
        "content-type"
      ) ?? "";

    /*
     * =========================================================
     * UPLOAD IMAGE / GIF
     * =========================================================
     */

    if (
      contentType.includes(
        "multipart/form-data"
      )
    ) {
      const formData =
        await request.formData();

      const fieldValue =
        formData.get("field");

      const file =
        formData.get("file");

      if (
        typeof fieldValue !== "string" ||
        !isImageField(fieldValue)
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Field gambar tidak valid",
          },
          { status: 400 }
        );
      }

      if (!(file instanceof File)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "File media tidak ditemukan",
          },
          { status: 400 }
        );
      }

      /*
       * =======================================================
       * SIZE
       * =======================================================
       */

      if (file.size <= 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "File kosong atau tidak valid",
          },
          { status: 400 }
        );
      }

      if (
        file.size >
        MAX_IMAGE_SIZE
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Ukuran media maksimal 8 MB",
          },
          { status: 400 }
        );
      }

      /*
       * =======================================================
       * EXTENSION
       * =======================================================
       */

      const extension =
        getExtension(file.name);

      if (!extension) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Format file tidak diperbolehkan. Gunakan JPG, JPEG, PNG, WEBP, atau GIF.",
          },
          { status: 400 }
        );
      }

      /*
       * =======================================================
       * MIME TYPE
       * =======================================================
       */

      const expectedMime =
        getMimeTypeFromExtension(
          extension
        );

      if (!expectedMime) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Format media tidak valid.",
          },
          { status: 400 }
        );
      }

      /*
       * Browser MIME bisa kosong / tidak akurat,
       * jadi kita cek jika tersedia.
       */

      if (
        file.type &&
        file.type !== expectedMime
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Tipe file tidak sesuai dengan ekstensi file.",
          },
          { status: 400 }
        );
      }

      /*
       * =======================================================
       * MAGIC BYTES / FILE SIGNATURE
       * =======================================================
       */

      const validSignature =
        await validateImageSignature(
          file
        );

      if (!validSignature) {
        return NextResponse.json(
          {
            success: false,
            error:
              "File bukan gambar yang valid atau file telah disamarkan.",
          },
          { status: 400 }
        );
      }

      /*
       * =======================================================
       * UPLOAD SUPABASE
       * =======================================================
       */

      const client =
        createSupabaseServiceClient();

      const current =
        await getWebsiteAppearance();

      const oldUrl =
        current[fieldValue];

      /*
       * PENTING:
       * Ekstensi asli dipertahankan.
       *
       * Kalau upload GIF:
       * contoh -> abc123.gif
       *
       * Jadi Supabase tidak mengubah GIF
       * menjadi JPG.
       */

      const randomName =
        `${crypto.randomUUID()}.${extension}`;

      const storagePath =
        `${IMAGE_CONFIG[fieldValue].folder}/${randomName}`;

      const fileBuffer =
        await file.arrayBuffer();

      const {
        error: uploadError,
      } =
        await client.storage
          .from("site-assets")
          .upload(
            storagePath,
            fileBuffer,
            {
              contentType:
                expectedMime,

              cacheControl:
                "3600",

              upsert: false,
            }
          );

      if (uploadError) {
        console.error(
          "Appearance media upload error:",
          uploadError
        );

        throw uploadError;
      }

      /*
       * =======================================================
       * PUBLIC URL
       * =======================================================
       */

      const {
        data: publicUrlData,
      } =
        client.storage
          .from("site-assets")
          .getPublicUrl(
            storagePath
          );

      const imageUrl =
        publicUrlData.publicUrl;

      /*
       * =======================================================
       * UPDATE DATABASE
       * =======================================================
       */

      const updated =
        await updateWebsiteAppearance({
          [fieldValue]: imageUrl,
        });

      /*
       * =======================================================
       * HAPUS FILE LAMA
       * =======================================================
       */

      if (
        oldUrl &&
        oldUrl.includes(
          "/storage/v1/object/public/site-assets/"
        )
      ) {
        const oldPath =
          getStoragePathFromUrl(
            oldUrl
          );

        if (oldPath) {
          const {
            error: removeError,
          } =
            await client.storage
              .from("site-assets")
              .remove([
                oldPath,
              ]);

          if (removeError) {
            console.error(
              "Failed removing old appearance media:",
              removeError
            );
          }
        }
      }

      /*
       * =======================================================
       * AUDIT LOG
       * =======================================================
       */

      await logAuditEvent({
        action:
          "admin.product_updated",

        entityType:
          "appearance",

        metadata: {
          type:
            "image_upload",

          field:
            fieldValue,

          fileType:
            expectedMime,

          extension,
        },
      });

      return NextResponse.json({
        success: true,

        message:
          `${IMAGE_CONFIG[fieldValue].label} berhasil diupload`,

        appearance:
          updated,

        imageUrl,

        mimeType:
          expectedMime,
      });
    }

    /*
     * =========================================================
     * SIMPAN TEXT / SETTING
     * =========================================================
     */

    const body =
      await request.json();

    const updates =
      sanitizeAppearanceBody(
        body
      );

    const updated =
      await updateWebsiteAppearance(
        updates
      );

    await logAuditEvent({
      action:
        "admin.product_updated",

      entityType:
        "appearance",

      metadata: {
        changes:
          Object.keys(updates),
      },
    });

    return NextResponse.json({
      success: true,

      message:
        "Tampilan website berhasil diperbarui",

      appearance:
        updated,
    });
  } catch (error) {
    console.error(
      "Update appearance error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Gagal memperbarui tampilan website",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const verification =
      await verifyAdminRequest();

    if (!verification.success) {
      return verification.response;
    }

    const body =
      await request.json();

    const field =
      body?.field;

    if (
      typeof field !== "string" ||
      !isImageField(field)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Field gambar tidak valid",
        },
        { status: 400 }
      );
    }

    const current =
      await getWebsiteAppearance();

    const imageUrl =
      current[field];

    const client =
      createSupabaseServiceClient();

    /*
     * Hapus file dari Supabase Storage
     */

    if (
      imageUrl &&
      imageUrl.includes(
        "/storage/v1/object/public/site-assets/"
      )
    ) {
      const storagePath =
        getStoragePathFromUrl(
          imageUrl
        );

      if (storagePath) {
        const {
          error: removeError,
        } =
          await client.storage
            .from("site-assets")
            .remove([
              storagePath,
            ]);

        if (removeError) {
          console.error(
            "Delete appearance image error:",
            removeError
          );
        }
      }
    }

    /*
     * Fallback bawaan LOOMS
     */

    const fallback =
      field === "heroImage"
        ? "/images/editorial-sand.svg"
        : "/images/editorial-teal.svg";

    const updated =
      await updateWebsiteAppearance({
        [field]: fallback,
      });

    await logAuditEvent({
      action:
        "admin.product_updated",

      entityType:
        "appearance",

      metadata: {
        type:
          "image_delete",

        field,
      },
    });

    return NextResponse.json({
      success: true,

      message:
        "Gambar berhasil dihapus",

      appearance:
        updated,
    });
  } catch (error) {
    console.error(
      "Delete appearance image error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Gagal menghapus gambar",
      },
      { status: 500 }
    );
  }
}
