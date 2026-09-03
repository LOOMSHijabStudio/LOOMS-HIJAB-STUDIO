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
    const verification = await verifyAdminRequest();

    if (!verification.success) {
      return verification.response as NextResponse<CollectionListResponse>;
    }

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

    const { data: collections, error } = await client
      .from("collections")
      .select(
        `
        id,
        name,
        slug,
        description,
        cover_image_path,
        banner_image_path,
        position,
        collection_products(count)
        `
      )
      .order("position", { ascending: true });

    if (error) {
      console.error("Collections list error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch collections",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      collections: (collections || []).map((col) => ({
        id: String(col.id),
        name: String(col.name),
        slug: String(col.slug),
        description: col.description as string | null,
        cover_image_path: col.cover_image_path as string | null,
        banner_image_path: col.banner_image_path as string | null,
        position: Number(col.position),
        product_count: Array.isArray(col.collection_products)
          ? col.collection_products.length
          : 0,
      })),
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
    const verification = await verifyAdminRequest();

    if (!verification.success) {
      return verification.response as NextResponse<CreateCollectionResponse>;
    }

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

    // Check for duplicate slug
    const { data: existing } = await client
      .from("collections")
      .select("id")
      .eq("slug", data.slug)
      .single();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Collection with this slug already exists",
        },
        { status: 409 }
      );
    }

    // Get max position
    const { data: maxPosition } = await client
      .from("collections")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const position = (maxPosition?.position || 0) + 1;

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

    // Log audit event
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
