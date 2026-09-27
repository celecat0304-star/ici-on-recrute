"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function AdminLogoutButton() {
  const deconnexion = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  };

  return (
    <button onClick={deconnexion} className="text-sm underline opacity-70">
      Se déconnecter
    </button>
  );
}
