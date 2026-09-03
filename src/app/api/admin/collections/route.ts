import { NextRequest, NextResponse } from "next/server";

import { verifyAdminRequest } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { userHasRole } from "@/server/authorization/permissions";
import { collectionSchema } from "@/server/validation/product";
import { logAuditEvent } from "@/server/auth/audit";

export const dynamic = "force-dynamic";

// ==========================================
// TYPES
// ==========================================

interface CollectionListResponse {
  success: boolean;

  collections?: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    cover_image_path: string | null;
    banner_image_path: string | null;
    position: number;
    product_count?: number;
  }>;

  error?: string;
}

interface CreateCollectionResponse {
  success: boolean;
  collectionId?: string;
  error?: string;
}

interface DeleteCollectionResponse {
  success: boolean;
  error?: string;
}

// ==========================================
// GET COLLECTIONS
// ==========================================

export async function GET(
  _request: NextRequest
): Promise<NextResponse<CollectionListResponse>> {
  void _request;

  try {
    // --------------------------------------
    // Check authentication
    // --------------------------------------

    const verification = await verifyAdminRequest();

    if (!verification.success) {
      return verification.response as NextResponse<CollectionListResponse>;
    }

    // --------------------------------------
    // Check admin / owner role
    // --------------------------------------

    const isAdmin = await userHasRole("ADMIN");
    const isOwner = await userHasRole("OWNER");

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 403 }
      );
    }

    // --------------------------------------
    // Supabase
    // --------------------------------------

    const client = createSupabaseServiceClient();

    // --------------------------------------
    // Get collections
    // --------------------------------------

    const { data: collections, error: collectionsError } = await client
      .from("collections")
      .select(
        `
        id,
        name,
        slug,
        description,
        cover_image_path,
        banner_image_path,
        position
        `
      )
      .order("position", {
        ascending: true,
      });

    if (collectionsError) {
      console.error(
        "Collections list error:",
        collectionsError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch collections",
        },
        { status: 500 }
      );
    }

    // --------------------------------------
    // Get product count
    // --------------------------------------

    const collectionsWithCount = await Promise.all(
      (collections ?? []).map(async (collection) => {
        const { count, error: countError } = await client
          .from("collection_products")
          .select("product_id", {
            count: "exact",
            head: true,
          })
          .eq("collection_id", collection.id);

        if (countError) {
          console.error(
            `Collection product count error for ${collection.id}:`,
            countError
          );
        }

        return {
          id: String(collection.id),

          name: String(collection.name),

          slug: String(collection.slug),

          description:
            collection.description as string | null,

          cover_image_path:
            collection.cover_image_path as string | null,

          banner_image_path:
            collection.banner_image_path as string | null,

          position: Number(collection.position),

          product_count: count ?? 0,
        };
      })
    );

    // --------------------------------------
    // Response
    // --------------------------------------

    return NextResponse.json({
      success: true,
      collections: collectionsWithCount,
    });
  } catch (error) {
    console.error(
      "Collections GET endpoint error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// ==========================================
// CREATE COLLECTION
// ==========================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateCollectionResponse>> {
  try {
    // --------------------------------------
    // Check authentication
    // --------------------------------------

    const verification = await verifyAdminRequest();

    if (!verification.success) {
      return verification.response as NextResponse<CreateCollectionResponse>;
    }

    // --------------------------------------
    // Check admin / owner role
    // --------------------------------------

    const isAdmin = await userHasRole("ADMIN");
    const isOwner = await userHasRole("OWNER");

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 403 }
      );
    }

    // --------------------------------------
    // Read body
    // --------------------------------------

    const body = await request.json();

    // --------------------------------------
    // Validate
    // --------------------------------------

    const validation = collectionSchema.safeParse(body);

    if (!validation.success) {
      console.error(
        "Collection validation error:",
        validation.error.flatten()
      );

      return NextResponse.json(
        {
          success: false,
          error: "Invalid collection data",
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // --------------------------------------
    // Supabase
    // --------------------------------------

    const client = createSupabaseServiceClient();

    // --------------------------------------
    // Check duplicate slug
    // --------------------------------------

    const { data: existing, error: existingError } =
      await client
        .from("collections")
        .select("id")
        .eq("slug", data.slug)
        .maybeSingle();

    if (existingError) {
      console.error(
        "Collection slug check error:",
        existingError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to check collection slug",
        },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Collection with this slug already exists",
        },
        { status: 409 }
      );
    }

    // --------------------------------------
    // Get next position
    // --------------------------------------

    const {
      data: maxPosition,
      error: positionError,
    } = await client
      .from("collections")
      .select("position")
      .order("position", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (positionError) {
      console.error(
        "Collection position error:",
        positionError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to determine collection position",
        },
        { status: 500 }
      );
    }

    const position =
      Number(maxPosition?.position ?? 0) + 1;

    // --------------------------------------
    // Insert collection
    // --------------------------------------

    const {
      data: newCollection,
      error: insertError,
    } = await client
      .from("collections")
      .insert({
        name: data.name,

        slug: data.slug,

        description:
          data.description || null,

        cover_image_path:
          data.cover_image_path || null,

        banner_image_path:
          data.banner_image_path || null,

        position,
      })
      .select("id")
      .single();

    if (insertError || !newCollection) {
      console.error(
        "Collection creation error:",
        insertError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create collection",
        },
        { status: 500 }
      );
    }

    // --------------------------------------
    // Audit log
    // --------------------------------------

    await logAuditEvent({
      action: "admin.collection_created",

      entityType: "collection",

      entityId: newCollection.id,

      metadata: {
        name: data.name,

        slug: data.slug,
      },
    });

    // --------------------------------------
    // Response
    // --------------------------------------

    return NextResponse.json(
      {
        success: true,
        collectionId: newCollection.id,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Create collection endpoint error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// ==========================================
// DELETE COLLECTION
// ==========================================

export async function DELETE(
  request: NextRequest
): Promise<NextResponse<DeleteCollectionResponse>> {
  try {
    // --------------------------------------
    // Check authentication
    // --------------------------------------

    const verification = await verifyAdminRequest();

    if (!verification.success) {
      return verification.response as NextResponse<DeleteCollectionResponse>;
    }

    // --------------------------------------
    // Check admin / owner role
    // --------------------------------------

    const isAdmin = await userHasRole("ADMIN");
    const isOwner = await userHasRole("OWNER");

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 403 }
      );
    }

    // --------------------------------------
    // Get collection ID
    // --------------------------------------

    const { searchParams } =
      new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Collection ID is required",
        },
        { status: 400 }
      );
    }

    // --------------------------------------
    // Supabase
    // --------------------------------------

    const client =
      createSupabaseServiceClient();

    // --------------------------------------
    // Find collection
    // --------------------------------------

    const {
      data: collection,
      error: findError,
    } = await client
      .from("collections")
      .select("id, name, slug")
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      console.error(
        "Find collection error:",
        findError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to find collection",
        },
        { status: 500 }
      );
    }

    if (!collection) {
      return NextResponse.json(
        {
          success: false,
          error: "Collection not found",
        },
        { status: 404 }
      );
    }

    // --------------------------------------
    // Delete product relationships first
    // --------------------------------------

    const {
      error: relationError,
    } = await client
      .from("collection_products")
      .delete()
      .eq("collection_id", id);

    if (relationError) {
      console.error(
        "Delete collection products error:",
        relationError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to remove products from collection",
        },
        { status: 500 }
      );
    }

    // --------------------------------------
    // Delete collection
    // --------------------------------------

    const {
      error: deleteError,
    } = await client
      .from("collections")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        "Delete collection error:",
        deleteError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete collection",
        },
        { status: 500 }
      );
    }

    // --------------------------------------
    // Audit log
    // --------------------------------------

    await logAuditEvent({
      action: "admin.collection_deleted",

      entityType: "collection",

      entityId: id,

      metadata: {
        name: collection.name,

        slug: collection.slug,
      },
    });

    // --------------------------------------
    // Response
    // --------------------------------------

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Delete collection endpoint error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
