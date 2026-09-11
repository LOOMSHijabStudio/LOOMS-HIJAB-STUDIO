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

/**
 * Ambil path file dari public URL Supabase Storage.
 */
function getStoragePathFromUrl(url: string): string | null {
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

/**
 * Sanitasi data text/settings.
 */
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

  const input = body as Record<string, unknown>;

  const result: Partial<WebsiteAppearance> = {};

  for (const key of appearanceKeys) {
    const value = input[key];

    if (typeof value === "string") {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Hanya JPG/JPEG/GIF.
 *
 * PNG, WebP, SVG, PDF, DOC, DOCX, ZIP, MP4,
 * dan file lainnya akan ditolak.
 */
function isAllowedAppearanceImage(file: File): boolean {
  return (
    file.type === "image/jpeg" ||
    file.type === "image/gif"
  );
}

/**
 * Periksa extension juga.
 *
 * Ini penting supaya file bukan cuma mengaku
 * sebagai GIF/JPG melalui MIME type.
 */
function hasAllowedImageExtension(
  fileName: string
): boolean {
  const lowerName = fileName.toLowerCase();

  return (
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".gif")
  );
}

/**
 * Periksa magic bytes file.
 *
 * JPG:
 * FF D8 FF
 *
 * GIF:
 * GIF87a / GIF89a
 */
async function hasValidImageSignature(
  file: File
): Promise<boolean> {
  const buffer = await file.arrayBuffer();

  const bytes = new Uint8Array(buffer);

  // JPEG
  const isJpeg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;

  // GIF87a
  const isGif87a =
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    bytes[4] === 0x37 &&
    bytes[5] === 0x61;

  // GIF89a
  const isGif89a =
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    bytes[4] === 0x39 &&
    bytes[5] === 0x61;

  return isJpeg || isGif87a || isGif89a;
}

/**
 * Tentukan extension asli file.
 */
function getImageExtension(
  file: File
): "jpg" | "gif" {
  if (file.type === "image/gif") {
    return "gif";
  }

  return "jpg";
}

/**
 * GET
 * Ambil appearance website.
 */
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

/**
 * POST
 *
 * Bisa digunakan untuk:
 *
 * 1. Upload JPG
 * 2. Upload GIF
 * 3. Simpan text/settings
 */
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
      request.headers.get("content-type") ?? "";

    /*
     * =========================================================
     * UPLOAD IMAGE
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

      /*
       * Pastikan field valid.
       */
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

      /*
       * Pastikan benar-benar File.
       */
      if (!(file instanceof File)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "File gambar tidak ditemukan",
          },
          { status: 400 }
        );
      }

      /*
       * =========================================================
       * FILE SIZE
       * =========================================================
       */

      const maxSize =
        8 * 1024 * 1024;

      if (file.size > maxSize) {
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
       * File kosong tidak boleh.
       */
      if (file.size <= 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "File tidak boleh kosong",
          },
          { status: 400 }
        );
      }

      /*
       * =========================================================
       * MIME TYPE
       * =========================================================
       *
       * HANYA:
       *
       * image/jpeg
       * image/gif
       *
       * Semua file lain ditolak.
       */

      if (!isAllowedAppearanceImage(file)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Format tidak didukung. Hanya JPG/JPEG dan GIF yang diperbolehkan.",
          },
          { status: 400 }
        );
      }

      /*
       * =========================================================
       * EXTENSION
       * =========================================================
       */

      if (
        !hasAllowedImageExtension(
          file.name
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Format file tidak valid. Gunakan file JPG/JPEG atau GIF.",
          },
          { status: 400 }
        );
      }

      /*
       * =========================================================
       * MAGIC BYTES
       * =========================================================
       *
       * Mencegah file palsu yang hanya mengganti
       * nama extension menjadi .jpg atau .gif.
       */

      const validSignature =
        await hasValidImageSignature(file);

      if (!validSignature) {
        return NextResponse.json(
          {
            success: false,
            error:
              "File media tidak valid atau isi file tidak sesuai dengan format JPG/GIF.",
          },
          { status: 400 }
        );
      }

      /*
       * Pastikan signature sesuai dengan MIME type.
       */
      const buffer =
        await file.arrayBuffer();

      const bytes =
        new Uint8Array(buffer);

      const isActuallyJpeg =
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff;

      const isActuallyGif =
        bytes.length >= 6 &&
        bytes[0] === 0x47 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        (
          (
            bytes[3] === 0x38 &&
            bytes[4] === 0x37 &&
            bytes[5] === 0x61
          ) ||
          (
            bytes[3] === 0x38 &&
            bytes[4] === 0x39 &&
            bytes[5] === 0x61
          )
        );

      if (
        file.type === "image/jpeg" &&
        !isActuallyJpeg
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Isi file bukan JPEG yang valid.",
          },
          { status: 400 }
        );
      }

      if (
        file.type === "image/gif" &&
        !isActuallyGif
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Isi file bukan GIF yang valid.",
          },
          { status: 400 }
        );
      }

      /*
       * =========================================================
       * SUPABASE
       * =========================================================
       */

      const client =
        createSupabaseServiceClient();

      const current =
        await getWebsiteAppearance();

      const oldUrl =
        current[fieldValue];

      /*
       * Pertahankan extension asli.
       *
       * JPG  -> .jpg
       * GIF  -> .gif
       */

      const extension =
        getImageExtension(file);

      const randomName =
        `${crypto.randomUUID()}.${extension}`;

      const storagePath =
        `${IMAGE_CONFIG[fieldValue].folder}/${randomName}`;

      /*
       * =========================================================
       * UPLOAD
       * =========================================================
       *
       * PENTING:
       * Jangan convert GIF menjadi JPG.
       *
       * Dengan cara ini file GIF tetap GIF
       * sehingga animasinya tetap berjalan
       * ketika ditampilkan di website.
       */

      const {
        error: uploadError,
      } = await client.storage
        .from("site-assets")
        .upload(
          storagePath,
          buffer,
          {
            contentType:
              file.type,

            cacheControl:
              "3600",

            upsert: false,
          }
        );

      if (uploadError) {
        console.error(
          "Appearance image upload error:",
          uploadError
        );

        throw uploadError;
      }

      /*
       * =========================================================
       * PUBLIC URL
       * =========================================================
       */

      const {
        data: publicUrlData,
      } = client.storage
        .from("site-assets")
        .getPublicUrl(
          storagePath
        );

      const imageUrl =
        publicUrlData.publicUrl;

      /*
       * =========================================================
       * SIMPAN URL KE DATABASE
       * =========================================================
       */

      const updated =
        await updateWebsiteAppearance({
          [fieldValue]:
            imageUrl,
        });

      /*
       * =========================================================
       * HAPUS GAMBAR LAMA
       * =========================================================
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
              "Failed removing old appearance image:",
              removeError
            );
          }
        }
      }

      /*
       * =========================================================
       * AUDIT LOG
       * =========================================================
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

          mimeType:
            file.type,

          extension,
        },
      });

      /*
       * =========================================================
       * RESPONSE
       * =========================================================
       */

      return NextResponse.json({
        success: true,

        message:
          `${IMAGE_CONFIG[fieldValue].label} berhasil diupload`,

        appearance:
          updated,

        imageUrl,
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
          Object.keys(
            updates
          ),
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

/**
 * DELETE
 *
 * Menghapus gambar Hero/Editorial
 * dari Supabase Storage.
 */
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
     * Hapus file dari Supabase Storage.
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
     * Kembalikan ke gambar default.
     */
    const fallback =
      field === "heroImage"
        ? "/images/editorial-sand.svg"
        : "/images/editorial-teal.svg";

    const updated =
      await updateWebsiteAppearance({
        [field]:
          fallback,
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
