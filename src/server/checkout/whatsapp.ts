import "server-only";

type WhatsAppItem = {
  productId?: string | null;
  variantId?: string | null;

  // Bentuk data baru dari RPC
  productName?: string | null;
  variantName?: string | null;
  unitPrice?: number | string | null;

  // Bentuk data lama / snapshot database
  product_name_snapshot?: string | null;
  variant_name_snapshot?: string | null;
  unit_price?: number | string | null;

  quantity?: number | string | null;
  subtotal?: number | string | null;
};

type WhatsAppOrder = {
  order: {
    id: string;
    order_number: string;
    status: string;
    subtotal: number | string;
    shipping_amount: number | string;
    total: number | string;
    customer_notes: string | null;
  };

  customer: {
    full_name: string;
    whatsapp_number: string;
    email: string | null;
  };

  address: {
    province: string;
    city: string;
    district: string;
    postal_code: string;
    full_address: string;
  };

  items: WhatsAppItem[];
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "");
    const parsed = Number(cleaned);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function formatRupiah(value: unknown): string {
  const amount = toNumber(value);

  return `Rp${Math.round(amount).toLocaleString("id-ID")}`;
}

function cleanText(value: unknown, fallback = "-"): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const text = value.trim();

  return text || fallback;
}

function getProductName(item: WhatsAppItem): string {
  return cleanText(
    item.productName ?? item.product_name_snapshot,
    "Produk",
  );
}

function getVariantName(item: WhatsAppItem): string {
  return cleanText(
    item.variantName ?? item.variant_name_snapshot,
    "-",
  );
}

function getUnitPrice(item: WhatsAppItem): number {
  return toNumber(item.unitPrice ?? item.unit_price);
}

function getQuantity(item: WhatsAppItem): number {
  const quantity = toNumber(item.quantity);

  if (quantity <= 0) {
    return 1;
  }

  return Math.floor(quantity);
}

function normalizeWhatsAppNumber(value: string): string {
  let number = value.replace(/\D/g, "");

  if (!number) {
    return "6281558066629";
  }

  // 08xxxxxxxx -> 628xxxxxxxx
  if (number.startsWith("08")) {
    number = `62${number.slice(1)}`;
  }

  // +62xxxxxxxx -> 62xxxxxxxx
  if (number.startsWith("620")) {
    number = `62${number.slice(3)}`;
  }

  return number;
}

export function buildWhatsAppMessage(order: WhatsAppOrder): string {
  const orderNumber = cleanText(order.order?.order_number, "-");

  const customerName = cleanText(
    order.customer?.full_name,
    "-",
  );

  const customerWhatsApp = cleanText(
    order.customer?.whatsapp_number,
    "-",
  );

  const customerEmail = cleanText(
    order.customer?.email,
    "-",
  );

  const province = cleanText(
    order.address?.province,
    "-",
  );

  const city = cleanText(
    order.address?.city,
    "-",
  );

  const district = cleanText(
    order.address?.district,
    "-",
  );

  const postalCode = cleanText(
    order.address?.postal_code,
    "-",
  );

  const fullAddress = cleanText(
    order.address?.full_address,
    "-",
  );

  const items = Array.isArray(order.items)
    ? order.items
    : [];

  const subtotal = toNumber(order.order?.subtotal);
  const shipping = toNumber(order.order?.shipping_amount);
  const total = toNumber(order.order?.total);

  const lines: string[] = [];

  lines.push("Halo LOOMS, saya ingin konfirmasi pesanan.");
  lines.push("");
  lines.push(`Order: ${orderNumber}`);
  lines.push("");
  lines.push("DATA CUSTOMER");
  lines.push(`Nama: ${customerName}`);
  lines.push(`WhatsApp: ${customerWhatsApp}`);
  lines.push(`Email: ${customerEmail}`);
  lines.push("");
  lines.push("ALAMAT PENGIRIMAN");
  lines.push(`Provinsi: ${province}`);
  lines.push(`Kota: ${city}`);
  lines.push(`Kecamatan: ${district}`);
  lines.push(`Kode Pos: ${postalCode}`);
  lines.push(`Alamat: ${fullAddress}`);
  lines.push("");
  lines.push("PESANAN");

  if (items.length === 0) {
    lines.push("1. Tidak ada item");
  } else {
    items.forEach((item, index) => {
      const productName = getProductName(item);
      const variantName = getVariantName(item);
      const quantity = getQuantity(item);
      const unitPrice = getUnitPrice(item);

      lines.push(`${index + 1}. ${productName}`);
      lines.push(`   Variant: ${variantName}`);
      lines.push(`   Qty: ${quantity}`);
      lines.push(`   Harga: ${formatRupiah(unitPrice)}`);
    });
  }

  lines.push("");
  lines.push("RINGKASAN PEMBAYARAN");
  lines.push(`Subtotal: ${formatRupiah(subtotal)}`);
  lines.push(`Ongkir: ${formatRupiah(shipping)}`);
  lines.push(`Total: ${formatRupiah(total)}`);

  const notes = cleanText(
    order.order?.customer_notes,
    "",
  );

  if (notes) {
    lines.push("");
    lines.push("CATATAN");
    lines.push(notes);
  }

  lines.push("");
  lines.push("Terima kasih.");

  return lines.join("\n");
}

export function buildWhatsAppUrl(
  message: string,
  phoneNumber?: string,
): string {
  const number = normalizeWhatsAppNumber(
    phoneNumber ||
      process.env.NEXT_PUBLIC_LOOMS_WHATSAPP_NUMBER ||
      "6281558066629",
  );

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
