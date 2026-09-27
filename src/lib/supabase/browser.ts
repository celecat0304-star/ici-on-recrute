import { createBrowserClient } from "@supabase/ssr";

// Client Supabase côté navigateur : utilisé pour la connexion et la double authentification.
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
