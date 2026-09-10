/*
 * ==========================================
 * AMBIL PLACEMENT PRODUK
 * ==========================================
 */

const productIds = (products || []).map(
  (product) => product.id
);

let placementsData: Array<{
  product_id: string;
  placement: string;
  position: number;
}> = [];

if (productIds.length > 0) {
  const {
    data,
    error: placementsError,
  } = await client
    .from("product_placements")
    .select(
      `
        product_id,
        placement,
        position
      `
    )
    .in("product_id", productIds)
    .order("position", {
      ascending: true,
    });

  if (placementsError) {
    console.error(
      "Product placements error:",
      placementsError
    );

    return NextResponse.json(
      {
        success: false,
        error:
          `Gagal mengambil placement produk: ${placementsError.message}`,
      },
      { status: 500 }
    );
  }

  placementsData =
    (data ?? []) as Array<{
      product_id: string;
      placement: string;
      position: number;
    }>;
}

/*
 * ==========================================
 * BUAT MAP PLACEMENT
 * ==========================================
 */

const placementMap =
  new Map<string, string[]>();

for (const placement of placementsData) {
  const existing =
    placementMap.get(
      placement.product_id
    ) ?? [];

  existing.push(
    placement.placement
  );

  placementMap.set(
    placement.product_id,
    existing
  );
}

/*
 * ==========================================
 * FORMAT DATA PRODUK
 * ==========================================
 */

const formatted = (products || []).map(
  (product) => {
    const images =
      (product.product_images ||
        []) as Array<{
        storage_path: string;
        is_primary: boolean;
      }>;

    const primaryImagePath =
      images.find(
        (img) => img.is_primary
      )?.storage_path ||
      images[0]?.storage_path;

    let primaryImage =
      "/images/editorial-mocha.svg";

    if (primaryImagePath) {
      const publicUrl =
        client.storage
          .from("product-images")
          .getPublicUrl(
            primaryImagePath
          );

      primaryImage =
        publicUrl.data.publicUrl;
    }

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: Number(product.price),

      sale_price:
        product.sale_price !== null &&
        product.sale_price !==
          undefined
          ? Number(
              product.sale_price
            )
          : null,

      stock: Number(
        product.stock || 0
      ),

      status: product.status,

      description:
        product.description || "",

      material:
        product.material || "",

      is_featured:
        Boolean(
          product.is_featured
        ),

      image: primaryImage,

      /*
       * ======================================
       * INI YANG PENTING
       * ======================================
       *
       * Produk sekarang membawa informasi:
       *
       * HOME
       * SHOP
       * NEW_ARRIVALS
       * COLLECTION
       * BEST_SELLERS
       */
      placements:
        placementMap.get(
          product.id
        ) ?? [],

      created_at:
        product.created_at,

      updated_at:
        product.updated_at,
    };
  }
);
