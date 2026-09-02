import type { DemoProduct } from "@/features/catalog/demo-data";
import { ProductCard } from "./product-card";

export function ProductGrid({ products }: { products: DemoProduct[] }) { return <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.slug} product={product} />)}</div>; }
