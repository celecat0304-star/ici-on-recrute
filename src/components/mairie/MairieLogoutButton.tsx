"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function MairieLogoutButton() {
  const deconnexion = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = "/mairie/login";
  };

  return (
    <button onClick={deconnexion} className="text-sm underline opacity-70 print:hidden">
      Se déconnecter
    </button>
  );
}
