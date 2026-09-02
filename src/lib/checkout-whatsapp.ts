export const ownerWhatsAppNumber =
  process.env.NEXT_PUBLIC_LOOMS_WHATSAPP_NUMBER || "6281558066629";

type CheckoutWhatsAppInput = {
  customer: {
    fullName: string;
    whatsappNumber: string;
    email?: string;
  };
  address: {
    province: string;
    city: string;
    district: string;
    postalCode: string;
    fullAddress: string;
    notes?: string;
  };
  items: Array<{
    name: string;
    variant: string;
    quantity: number;
    unitPrice: number;
  }>;
  subtotal: number;
  shipping: number;
};

const money = (value: number) =>
  `Rp${value.toLocaleString("id-ID")}`;

export function buildCheckoutWhatsAppMessage(
  checkout: CheckoutWhatsAppInput
): string {
  const itemLines = checkout.items
    .map(
      (item, index) =>
        `${index + 1}. ${item.name}\n` +
        `   Varian: ${item.variant}\n` +
        `   Jumlah: ${item.quantity}\n` +
        `   Harga: ${money(item.unitPrice)}\n` +
        `   Total: ${money(item.unitPrice * item.quantity)}`
    )
    .join("\n\n");

  return (
    "Halo LOOMS, saya ingin melakukan pemesanan.\n\n" +
    "DATA CUSTOMER\n" +
    `Nama: ${checkout.customer.fullName}\n` +
    `WhatsApp: ${checkout.customer.whatsappNumber}\n` +
    `Email: ${checkout.customer.email || "-"}\n\n` +
    "PESANAN\n" +
    `${itemLines}\n\n` +
    `Subtotal: ${money(checkout.subtotal)}\n` +
    `Ongkir: ${money(checkout.shipping)}\n` +
    `Total Pembayaran: ${money(checkout.subtotal + checkout.shipping)}\n\n` +
    "ALAMAT PENGIRIMAN\n" +
    `${checkout.address.fullAddress}\n` +
    `${checkout.address.district}, ${checkout.address.city}\n` +
    `${checkout.address.province} ${checkout.address.postalCode}\n\n` +
    "CATATAN\n" +
    `${checkout.address.notes || "-"}\n\n` +
    "Mohon konfirmasi ketersediaan dan pesanan saya. Terima kasih."
  );
}

export function buildCheckoutWhatsAppUrl(
  checkout: CheckoutWhatsAppInput
): string {
  return `https://wa.me/${ownerWhatsAppNumber}?text=${encodeURIComponent(
    buildCheckoutWhatsAppMessage(checkout)
  )}`;
}
