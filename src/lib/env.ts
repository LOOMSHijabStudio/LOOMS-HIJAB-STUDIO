import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_LOOMS_WHATSAPP_NUMBER: z.string().regex(/^628[0-9]{8,13}$/).default("6281558066629"),
});
const parsed = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_LOOMS_WHATSAPP_NUMBER:
    process.env.NEXT_PUBLIC_LOOMS_WHATSAPP_NUMBER,
});
if (!parsed.success) throw new Error("Invalid environment configuration.");
export const env = parsed.data;
