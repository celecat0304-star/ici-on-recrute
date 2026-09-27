import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerEmail } from "@/lib/resend";

const MAX_OFFRES = 10;

export async function POST(request: NextRequest) {
  const { villeId, email, offres } = await request.json();

  if (!villeId || !email || !Array.isArray(offres) || offres.length === 0) {
    return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail invalide." }, { status: 400 });
  }

  if (offres.length > MAX_OFFRES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_OFFRES} offres.` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: panier, error: erreurPanier } = await supabase
    .from("paniers")
    .insert({ email, ville_id: villeId })
    .select("id")
    .single();

  if (erreurPanier || !panier) {
    return NextResponse.json(
      { error: erreurPanier?.message ?? "Erreur." },
      { status: 500 }
    );
  }

  const lignes = offres
    .filter(
      (o: { source?: string; id?: string }) =>
        (o.source === "commercant" || o.source === "france_travail") && o.id
    )
    .map((o: { source: string; id: string }) => ({
      panier_id: panier.id,
      offre_type: o.source,
      offre_id: o.id,
    }));

  if (lignes.length > 0) {
    const { error: erreurLignes } = await supabase
      .from("panier_offres")
      .insert(lignes);
    if (erreurLignes) {
      return NextResponse.json({ error: erreurLignes.message }, { status: 500 });
    }
  }

  const lien = `${new URL(request.url).origin}/panier/${panier.id}`;

  try {
    await envoyerEmail({
      a: email,
      sujet: "Vos offres sélectionnées — Ici on recrute",
      html: `
        <p>Voici le lien vers les offres que vous avez sélectionnées :</p>
        <p><a href="${lien}">${lien}</a></p>
      `,
    });
  } catch {
    // On ne bloque pas si l'e-mail échoue : le QR code affiché sur la borne fonctionne quand même.
  }

  return NextResponse.json({ ok: true, panierId: panier.id, lien });
}
