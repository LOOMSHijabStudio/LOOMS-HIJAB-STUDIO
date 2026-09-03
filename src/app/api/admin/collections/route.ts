import { NextRequest, NextResponse } from "next/server";

import { verifyAdminRequest } from "@/server/auth/api-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { userHasRole } from "@/server/authorization/permissions";
import { collectionSchema } from "@/server/validation/product";
import { logAuditEvent } from "@/server/auth/audit";

export const dynamic = "force-dynamic";

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

export async function GET(
  _request: NextRequest
): Promise<NextResponse<CollectionListResponse>> {
  void _request;

  try {
    // Check admin authentication
    const verification = await verifyAdminRequest();

    if (!verification.success) {
      return verification.response as NextResponse<CollectionListResponse>;
    }

    // Check admin / owner role
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

    const client = createSupabaseServiceClient();

    // Get collections first.
    // We intentionally do NOT use collection_products(count)
    // here so the endpoint does not depend on Supabase relationship
    // detection.
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
      .order("position", { ascending: true });

    if (collectionsError) {
      console.error("Collections list error:", collectionsError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch collections",
        },
        { status: 500 }
      );
    }

    // Get product count for every collection.
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
          description: collection.description as string | null,
          cover_image_path: collection.cover_image_path as string | null,
          banner_image_path: collection.banner_image_path as string | null,
          position: Number(collection.position),
          product_count: count ?? 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      collections: collectionsWithCount,
    });
  } catch (error) {
    console.error("Collections endpoint error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

interface CreateCollectionResponse {
  success: boolean;
  collectionId?: string;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateCollectionResponse>> {
  try {
    // Check admin authentication
    const verification = await verifyAdminRequest();

    if (!verification.success) {
      return verification.response as NextResponse<CreateCollectionResponse>;
    }

    // Check admin / owner role
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

    const body = await request.json();

    // Validate request body
    const validation = collectionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid collection data",
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    const client = createSupabaseServiceClient();

    // Check duplicate slug
    const { data: existing, error: existingError } = await client
      .from("collections")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();

    if (existingError) {
      console.error("Collection slug check error:", existingError);

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

    // Get the current highest position
    const { data: maxPosition, error: positionError } = await client
      .from("collections")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (positionError) {
      console.error("Collection position error:", positionError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to determine collection position",
        },
        { status: 500 }
      );
    }

    const position = Number(maxPosition?.position ?? 0) + 1;

    // Create collection
    const { data: newCollection, error: insertError } = await client
      .from("collections")
      .insert({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        cover_image_path: data.cover_image_path || null,
        banner_image_path: data.banner_image_path || null,
        position,
      })
      .select("id")
      .single();

    if (insertError || !newCollection) {
      console.error("Collection creation error:", insertError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create collection",
        },
        { status: 500 }
      );
    }

    // Audit log
    await logAuditEvent({
      action: "admin.collection_created",
      entityType: "collection",
      entityId: newCollection.id,
      metadata: {
        name: data.name,
        slug: data.slug,
      },
    });

    return NextResponse.json(
      {
        success: true,
        collectionId: newCollection.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create collection endpoint error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
