import { createClient } from "@supabase/supabase-js";

// Client Supabase "admin" : contourne les règles RLS, ne doit jamais tourner dans le navigateur.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
