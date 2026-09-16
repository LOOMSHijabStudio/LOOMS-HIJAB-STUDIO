import "server-only";

import { z } from "zod";

import {
  addressSchema,
  customerSchema,
  orderLineSchema,
} from "@/server/catalog/validation";

const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^\+?[0-9 ()-]{7,32}$/,
    "Invalid WhatsApp number",
  );

export const checkoutSchema = z
  .object({
    idempotencyKey: z
      .string()
      .trim()
      .min(16)
      .max(255),

    items: z
      .array(orderLineSchema)
      .min(1)
      .max(100),

    customer: customerSchema.extend({
      whatsappNumber: phoneSchema,
    }),

    address: addressSchema,

    /*
     * ==========================================
     * PROMO
     * ==========================================
     *
     * Promo berasal dari hasil validasi promo
     * di checkout.
     *
     * Promo tidak boleh dianggap sebagai
     * harga dari client.
     *
     * Nilai ini hanya digunakan untuk membawa
     * hasil promo ke proses checkout dan
     * WhatsApp.
     */
    promoCode: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),

    promoDiscount: z
      .number()
      .finite()
      .min(0)
      .optional()
      .default(0),

    /*
     * Client price fields tetap DILARANG.
     *
     * Harga produk tetap berasal dari server.
     */
    clientPrice: z.never().optional(),

    clientSubtotal: z.never().optional(),

    clientShipping: z.never().optional(),

    clientTotal: z.never().optional(),
  })
  .strict();

export type CheckoutInput =
  z.infer<typeof checkoutSchema>;
