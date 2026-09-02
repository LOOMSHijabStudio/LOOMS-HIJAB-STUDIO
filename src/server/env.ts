import "server-only";
import { z } from "zod";
import { env as publicEnv } from "@/lib/env";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(32).optional(),
});
const parsed = serverSchema.safeParse({ SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL: process.env.DATABASE_URL, AUTH_SECRET: process.env.AUTH_SECRET });
if (!parsed.success) throw new Error("Invalid server environment configuration.");
export const serverEnv = { ...publicEnv, ...parsed.data };
