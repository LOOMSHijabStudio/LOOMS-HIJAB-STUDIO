import { NextResponse } from "next/server";

import { getCatalogProducts } from "@/server/store/catalog-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await getCatalogProducts();

    return NextResponse.json(products);
  } catch (error) {
    console.error(
      "Failed to load catalog products:",
      error,
    );

    return NextResponse.json(
      {
        error: "Failed to load products",
      },
      {
        status: 500,
      },
    );
  }
}
