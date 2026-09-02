import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/catalog/product-detail";
import { ProductGrid } from "@/components/catalog/product-grid";
import { demoProducts, getDemoProduct } from "@/features/catalog/demo-data";

type ProductPageProps = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return demoProducts.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> { const product = getDemoProduct((await params).slug); return product ? { title: product.name, description: product.description, openGraph: { images: [{ url: product.image, alt: product.imageAlt }] } } : {}; }
export default async function ProductPage({ params }: ProductPageProps) { const product = getDemoProduct((await params).slug); if (!product) notFound(); return <main><ProductDetail product={product} /><section className="mx-auto max-w-[1440px] px-5 pb-20 lg:px-10"><p className="text-[10px] font-medium tracking-[0.16em] text-looms-gray">YOU MAY ALSO LIKE</p><h2 className="mt-3 font-display text-4xl">Continue the story.</h2><div className="mt-9"><ProductGrid products={demoProducts.filter((item) => item.slug !== product.slug).slice(0, 3)} /></div></section></main>; }
