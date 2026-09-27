import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CONTRATS_VALIDES = ["CDI", "CDD", "Saisonnier", "Extra", "Apprentissage"];
const LIMITE_DEPOTS_PAR_HEURE = 5;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    nomCommerce,
    villeId,
    poste,
    typeContrat,
    tempsTravail,
    horaires,
    quartier,
    description,
    commentPostuler,
    siret,
    siteWeb, // champ piège (honeypot)
    captchaA,
    captchaB,
    captchaReponse,
  } = body ?? {};

  // Piège à robots : un humain laisse ce champ vide
  if (siteWeb) {
    return NextResponse.json({ ok: true });
  }

  if (Number(captchaA) + Number(captchaB) !== Number(captchaReponse)) {
    return NextResponse.json(
      { error: "Réponse anti-robot incorrecte." },
      { status: 400 }
    );
  }

  if (!nomCommerce || !villeId || !poste || !typeContrat || !commentPostuler) {
    return NextResponse.json(
      { error: "Merci de remplir tous les champs obligatoires." },
      { status: 400 }
    );
  }

  if (!CONTRATS_VALIDES.includes(typeContrat)) {
    return NextResponse.json({ error: "Type de contrat invalide." }, { status: 400 });
  }

  if (typeof description === "string" && description.length > 400) {
    return NextResponse.json(
      { error: "La description doit faire 400 caractères maximum." },
      { status: 400 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "inconnu";

  const supabase = createAdminClient();

  const uneHeureAvant = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("depots_ip")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", uneHeureAvant);

  if ((count ?? 0) >= LIMITE_DEPOTS_PAR_HEURE) {
    return NextResponse.json(
      { error: "Trop de dépôts depuis cette connexion, réessayez plus tard." },
      { status: 429 }
    );
  }

  const siretNettoye =
    typeof siret === "string" ? siret.replace(/\s/g, "") : null;

  const { error } = await supabase.from("offres_commercants").insert({
    ville_id: villeId,
    nom_commerce: nomCommerce,
    poste,
    type_contrat: typeContrat,
    temps_travail: tempsTravail || null,
    horaires: horaires || null,
    quartier: quartier || null,
    description: description || null,
    comment_postuler: commentPostuler,
    siret: siretNettoye || null,
    statut: "en_attente",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("depots_ip").insert({ ip });

  return NextResponse.json({ ok: true });
}
