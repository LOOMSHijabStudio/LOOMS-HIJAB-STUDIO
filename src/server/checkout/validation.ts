import "server-only";
import { z } from "zod";
import { addressSchema, customerSchema, orderLineSchema } from "@/server/catalog/validation";

const phoneSchema = z.string().trim().regex(/^\+?[0-9 ()-]{7,32}$/, "Invalid WhatsApp number");

export const checkoutSchema = z.object({
  idempotencyKey: z.string().trim().min(16).max(255),
  items: z.array(orderLineSchema).min(1).max(100),
  customer: customerSchema.extend({ whatsappNumber: phoneSchema }),
  address: addressSchema,
  clientPrice: z.never().optional(),
  clientSubtotal: z.never().optional(),
  clientShipping: z.never().optional(),
  clientTotal: z.never().optional(),
}).strict();

export type CheckoutInput = z.infer<typeof checkoutSchema>;
