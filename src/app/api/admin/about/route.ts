import { NextRequest, NextResponse } from "next/server";

import { verifyAdminRequest } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_ABOUT = {
  id: 1,
  eyebrow: "OUR POINT OF VIEW",
  title:
    "A wardrobe for moving softly through the world.",
  description:
    "LOOMS is an ongoing study in ease, texture, and daily rituals. We believe modest wear can feel beautifully instinctive—an expression of presence rather than performance.",
  image_url:
    "/images/editorial-olive.svg",
  philosophy_eyebrow:
    "THE LOOMS PHILOSOPHY",
  philosophy_title:
    "Considered, never complicated.",
  philosophy_description:
    "We begin with a feeling: a colour that settles the eye, a fabric that moves with you, a detail that earns its place. Each LOOMS piece is designed to quietly support your rhythm.",
  intention_eyebrow:
    "MADE WITH INTENTION",
  intention_title:
    "Less noise. More meaning.",
  intention_description:
    "This is editable editorial content prepared for the future LOOMS CMS. It can grow into a clear account of material choices, collaborators, and the people who bring each collection to life.",
};

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

async function getAboutData() {
  const client =
    createSupabaseServiceClient();

  const { data, error } = await client
    .from("website_about")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    ...DEFAULT_ABOUT,
    ...(data ?? {}),
  };
}

export async function GET() {
  try {
    const verification =
      await verifyAdminRequest();

    if (!verification.success) {
      return verification.response;
    }

    const about =
      await getAboutData();

    return NextResponse.json({
      success: true,
      about,
    });
  } catch (error) {
    console.error(
      "Get about error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Gagal mengambil data About Us",
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
     * ==========================================
     * UPLOAD FOTO ABOUT
     * ==========================================
     */
    if (
      contentType.includes(
        "multipart/form-data"
      )
    ) {
      const formData =
        await request.formData();

      const file =
        formData.get("file");

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
        file.type !==
        "image/jpeg"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Hanya JPG/JPEG yang diperbolehkan",
          },
          { status: 400 }
        );
      }

      if (
        file.size >
        8 * 1024 * 1024
      ) {
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
        await getAboutData();

      const storagePath =
        `about/${crypto.randomUUID()}.jpg`;

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

      const { error: updateError } =
        await client
          .from("website_about")
          .update({
            image_url: imageUrl,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", 1);

      if (updateError) {
        throw updateError;
      }

      /*
       * Hapus gambar lama kalau berasal
       * dari site-assets.
       */
      if (
        current.image_url &&
        current.image_url.includes(
          "/storage/v1/object/public/site-assets/"
        )
      ) {
        const oldPath =
          getStoragePathFromUrl(
            current.image_url
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
              "Failed removing old About image:",
              removeError
            );
          }
        }
      }

      const about =
        await getAboutData();

      return NextResponse.json({
        success: true,
        message:
          "Foto About berhasil diupload",
        about,
      });
    }

    /*
     * ==========================================
     * SIMPAN DATA TEXT
     * ==========================================
     */
    const body =
      await request.json();

    const allowedFields = [
      "eyebrow",
      "title",
      "description",
      "philosophy_eyebrow",
      "philosophy_title",
      "philosophy_description",
      "intention_eyebrow",
      "intention_title",
      "intention_description",
    ] as const;

    const updates: Record<
      string,
      string
    > = {};

    for (const field of allowedFields) {
      if (
        typeof body?.[field] ===
        "string"
      ) {
        updates[field] =
          body[field];
      }
    }

    const client =
      createSupabaseServiceClient();

    const { error } =
      await client
        .from("website_about")
        .update({
          ...updates,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", 1);

    if (error) {
      throw error;
    }

    const about =
      await getAboutData();

    return NextResponse.json({
      success: true,
      message:
        "About Us berhasil disimpan",
      about,
    });
  } catch (error) {
    console.error(
      "Update about error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Gagal menyimpan About Us",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const verification =
      await verifyAdminRequest();

    if (!verification.success) {
      return verification.response;
    }

    const client =
      createSupabaseServiceClient();

    const current =
      await getAboutData();

    if (
      current.image_url &&
      current.image_url.includes(
        "/storage/v1/object/public/site-assets/"
      )
    ) {
      const storagePath =
        getStoragePathFromUrl(
          current.image_url
        );

      if (storagePath) {
        await client.storage
          .from("site-assets")
          .remove([
            storagePath,
          ]);
      }
    }

    await client
      .from("website_about")
      .update({
        image_url:
          DEFAULT_ABOUT.image_url,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", 1);

    const about =
      await getAboutData();

    return NextResponse.json({
      success: true,
      message:
        "Foto About berhasil dihapus",
      about,
    });
  } catch (error) {
    console.error(
      "Delete About image error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Gagal menghapus foto About",
      },
      { status: 500 }
    );
  }
}
