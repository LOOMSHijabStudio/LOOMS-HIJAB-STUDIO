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

type ImageField =
  keyof typeof IMAGE_CONFIG;

const appearanceKeys: Array<
  keyof WebsiteAppearance
> = [
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

function isImageField(
  value: string
): value is ImageField {
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
              "File gambar tidak ditemukan",
          },
          { status: 400 }
        );
      }

      if (
        file.type !== "image/jpeg"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Hanya file JPG/JPEG yang diperbolehkan",
          },
          { status: 400 }
        );
      }

      const maxSize =
        8 * 1024 * 1024;

      if (file.size > maxSize) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Ukuran gambar maksimal 8 MB",
          },
          { status: 400 }
        );
      }

      const client =
        createSupabaseServiceClient();

      const current =
        await getWebsiteAppearance();

      const oldUrl =
        current[fieldValue];

      const randomName =
        `${crypto.randomUUID()}.jpg`;

      const storagePath =
        `${IMAGE_CONFIG[fieldValue].folder}/${randomName}`;

      const fileBuffer =
        await file.arrayBuffer();

      const { error: uploadError } =
        await client.storage
          .from("site-assets")
          .upload(
            storagePath,
            fileBuffer,
            {
              contentType:
                "image/jpeg",
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

      const updated =
        await updateWebsiteAppearance({
          [fieldValue]: imageUrl,
        });

      /*
       * Hapus file lama jika sebelumnya
       * berasal dari bucket site-assets.
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
          const { error: removeError } =
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

      await logAuditEvent({
        action:
          "admin.product_updated",
        entityType:
          "appearance",
        metadata: {
          type: "image_upload",
          field: fieldValue,
        },
      });

      return NextResponse.json({
        success: true,
        message:
          `${IMAGE_CONFIG[fieldValue].label} berhasil diupload`,
        appearance: updated,
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
          Object.keys(updates),
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Tampilan website berhasil diperbarui",
      appearance: updated,
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
        type: "image_delete",
        field,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Gambar berhasil dihapus",
      appearance: updated,
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
