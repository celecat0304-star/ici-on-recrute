import { createClient } from "@supabase/supabase-js";

// Client Supabase public : lecture seule des données déjà validées (RLS).
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
