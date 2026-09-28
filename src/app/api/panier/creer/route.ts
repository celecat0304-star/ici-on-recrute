import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerEmail } from "@/lib/resend";

const MAX_OFFRES = 10;

async function envoyerLien(email: string, lien: string) {
  try {
    await envoyerEmail({
      a: email,
      sujet: "Vos offres sélectionnées — Ici on recrute",
      html: `
        <p>Voici le lien vers les offres que vous avez sélectionnées :</p>
        <p><a href="${lien}">${lien}</a></p>
      `,
    });
  } catch (err) {
    // On ne bloque pas si l'e-mail échoue : le QR code affiché sur la borne fonctionne quand même.
    console.error("Échec envoi e-mail panier :", err);
  }
}

export async function POST(request: NextRequest) {
  const { villeId, email, offres, panierId } = await request.json();
  const aUnEmail = typeof email === "string" && email.trim() !== "";

  if (!villeId || !Array.isArray(offres) || offres.length === 0) {
    return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
  }

  if (aUnEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail invalide." }, { status: 400 });
  }

  if (offres.length > MAX_OFFRES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_OFFRES} offres.` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const origine = new URL(request.url).origin;

  // Panier déjà créé pour le QR code : on lui ajoute l'e-mail, sans le recréer
  if (panierId && aUnEmail) {
    const { data: existant } = await supabase
      .from("paniers")
      .select("id, email")
      .eq("id", panierId)
      .eq("ville_id", villeId)
      .maybeSingle();

    if (existant && existant.email === "") {
      const { error: erreurMaj } = await supabase
        .from("paniers")
        .update({ email })
        .eq("id", panierId);
      if (erreurMaj) {
        return NextResponse.json({ error: erreurMaj.message }, { status: 500 });
      }
      const lien = `${origine}/panier/${panierId}`;
      await envoyerLien(email, lien);
      return NextResponse.json({ ok: true, panierId, lien });
    }
  }

  // Une adresse vide est enregistrée pour un panier destiné uniquement au QR code
  const { data: panier, error: erreurPanier } = await supabase
    .from("paniers")
    .insert({ email: aUnEmail ? email : "", ville_id: villeId })
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

  const lien = `${origine}/panier/${panier.id}`;

  if (aUnEmail) {
    await envoyerLien(email, lien);
  }

  return NextResponse.json({ ok: true, panierId: panier.id, lien });
}
