type PriceDisplayProps = { price: number; salePrice?: number; compact?: boolean };
const format = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export function PriceDisplay({ price, salePrice, compact = false }: PriceDisplayProps) {
  const discount = salePrice ? Math.round((1 - salePrice / price) * 100) : 0;
  return <div className={compact ? "text-sm" : "text-base"}><span className="font-medium text-looms-teal">{format(salePrice ?? price)}</span>{salePrice && <><span className="ml-2 text-looms-gray line-through">{format(price)}</span><span className="ml-2 text-xs font-medium text-looms-teal">−{discount}%</span></>}</div>;
}
