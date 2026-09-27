import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function genererMotDePasse(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from({ length: 14 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}

export async function POST(request: NextRequest) {
  const { villeId, email } = await request.json();

  if (!villeId || !email) {
    return NextResponse.json(
      { error: "Ville et e-mail obligatoires." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const motDePasse = genererMotDePasse();

  const { data: utilisateur, error: erreurCreation } =
    await supabase.auth.admin.createUser({
      email,
      password: motDePasse,
      email_confirm: true,
    });

  if (erreurCreation) {
    return NextResponse.json({ error: erreurCreation.message }, { status: 500 });
  }

  const { error: erreurLiaison } = await supabase
    .from("comptes_mairie")
    .insert({ user_id: utilisateur.user.id, ville_id: villeId });

  if (erreurLiaison) {
    await supabase.auth.admin.deleteUser(utilisateur.user.id);
    return NextResponse.json({ error: erreurLiaison.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email, motDePasse });
}
