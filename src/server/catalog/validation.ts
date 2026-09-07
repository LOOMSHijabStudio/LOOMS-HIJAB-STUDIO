import "server-only";
import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const orderLineSchema = z.object({
  productId: uuidSchema,
  variantId: uuidSchema.optional(),
  quantity: z.number().int().min(1).max(99),
});

export const customerSchema = z.object({
  fullName: z.string().trim().min(1, "Nama wajib diisi").max(200),

  whatsappNumber: z
    .string()
    .trim()
    .min(7, "Nomor WhatsApp tidak valid")
    .max(32),

  // Email boleh kosong
  email: z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .pipe(z.string().email("Email tidak valid").optional()),
});

export const addressSchema = z.object({
  province: z.string().trim().min(1, "Provinsi wajib diisi").max(100),

  city: z.string().trim().min(1, "Kota wajib diisi").max(100),

  district: z.string().trim().min(1, "Kecamatan wajib diisi").max(100),

  postalCode: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z -]{3,16}$/, "Kode pos tidak valid"),

  fullAddress: z
    .string()
    .trim()
    .min(5, "Alamat wajib diisi")
    .max(1000),

  notes: z
    .string()
    .trim()
    .max(500)
    .optional(),
});
