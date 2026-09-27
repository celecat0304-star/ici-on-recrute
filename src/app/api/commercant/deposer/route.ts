import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CONTRATS_VALIDES = ["CDI", "CDD", "Saisonnier", "Extra", "Apprentissage"];
const LIMITE_DEPOTS_PAR_HEURE = 5;
const BUCKET_PHOTOS = "offres-commercants";

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
    sourceImage, // "upload" | "pexels" | "aucune"
    photoBase64,
    consentementPhoto,
    pexelsUrl,
    pexelsPhotographe,
    pexelsLienPhoto,
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

  if (sourceImage === "upload" && !consentementPhoto) {
    return NextResponse.json(
      {
        error:
          "Merci de confirmer que cette photo vous appartient et que les personnes visibles ont donné leur accord.",
      },
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

  let imageUrl: string | null = null;

  if (sourceImage === "upload" && typeof photoBase64 === "string") {
    const correspondance = photoBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!correspondance) {
      return NextResponse.json({ error: "Image invalide." }, { status: 400 });
    }
    const tampon = Buffer.from(correspondance[2], "base64");
    if (tampon.byteLength > 3 * 1024 * 1024) {
      return NextResponse.json({ error: "Image trop volumineuse." }, { status: 400 });
    }
    const chemin = `${crypto.randomUUID()}.jpg`;
    const { error: erreurUpload } = await supabase.storage
      .from(BUCKET_PHOTOS)
      .upload(chemin, tampon, { contentType: "image/jpeg" });

    if (erreurUpload) {
      return NextResponse.json({ error: erreurUpload.message }, { status: 500 });
    }

    imageUrl = supabase.storage.from(BUCKET_PHOTOS).getPublicUrl(chemin).data
      .publicUrl;
  }

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
    image_url:
      sourceImage === "pexels" ? pexelsUrl || null : sourceImage === "upload" ? imageUrl : null,
    image_source: sourceImage === "upload" || sourceImage === "pexels" ? sourceImage : "aucune",
    pexels_photographe: sourceImage === "pexels" ? pexelsPhotographe || null : null,
    pexels_url: sourceImage === "pexels" ? pexelsLienPhoto || null : null,
    consentement_photo: sourceImage === "upload" ? Boolean(consentementPhoto) : false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("depots_ip").insert({ ip });

  return NextResponse.json({ ok: true });
}
