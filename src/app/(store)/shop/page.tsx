import type { Metadata } from "next";
import { ShopBrowser } from "@/components/catalog/shop-browser";

export const metadata: Metadata = { title: "Shop", description: "Explore the considered LOOMS collection." };
export default function ShopPage() { return <main className="mx-auto max-w-[1440px] px-5 py-12 lg:px-10 lg:py-16"><p className="text-[10px] font-medium tracking-[0.16em] text-looms-gray">THE LOOMS COLLECTION</p><h1 className="mt-3 font-display text-5xl md:text-7xl">Shop all pieces.</h1><p className="mt-5 max-w-lg text-sm leading-7 text-looms-gray">A development catalog for visual and browsing validation. Product and filter data will be server-authoritative in Phase 3.</p><ShopBrowser /></main>; }
