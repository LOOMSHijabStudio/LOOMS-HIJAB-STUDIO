import "server-only";
import { z } from "zod";
export const uuidSchema = z.string().uuid();
export const orderLineSchema = z.object({ productId: uuidSchema, variantId: uuidSchema.optional(), quantity: z.number().int().min(1).max(99) });
export const customerSchema = z.object({ fullName: z.string().trim().min(1).max(200), whatsappNumber: z.string().trim().min(7).max(32), email: z.string().email().optional() });
export const addressSchema = z.object({ province: z.string().trim().min(1).max(100), city: z.string().trim().min(1).max(100), district: z.string().trim().min(1).max(100), postalCode: z.string().trim().regex(/^[0-9A-Za-z -]{3,16}$/), fullAddress: z.string().trim().min(5).max(1000), notes: z.string().trim().max(500).optional() });
