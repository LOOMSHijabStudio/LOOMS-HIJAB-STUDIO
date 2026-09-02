import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/server/env";

export function createSupabaseServiceClient() {
  if (!serverEnv.NEXT_PUBLIC_SUPABASE_URL || !serverEnv.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase service configuration is missing.");
  return createClient(serverEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}
