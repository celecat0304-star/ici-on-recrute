import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerEmail } from "@/lib/resend";

const LIMITE_PAR_HEURE = 8;
const TAILLE_MAX_CV = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    offreId,
    nomCandidat,
    contactCandidat,
    message,
    cvBase64,
    cvNomFichier,
    siteWeb, // piège à robots
    captchaA,
    captchaB,
    captchaReponse,
  } = body ?? {};

  if (siteWeb) {
    return NextResponse.json({ ok: true });
  }

  if (Number(captchaA) + Number(captchaB) !== Number(captchaReponse)) {
    return NextResponse.json(
      { error: "Réponse anti-robot incorrecte." },
      { status: 400 }
    );
  }

  if (!offreId || !nomCandidat || !contactCandidat) {
    return NextResponse.json(
      { error: "Merci de remplir tous les champs obligatoires." },
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

  if ((count ?? 0) >= LIMITE_PAR_HEURE) {
    return NextResponse.json(
      { error: "Trop d'envois depuis cette connexion, réessayez plus tard." },
      { status: 429 }
    );
  }

  const { data: offre } = await supabase
    .from("offres_commercants")
    .select("id, ville_id, nom_commerce, poste, email_contact")
    .eq("id", offreId)
    .eq("statut", "publiee")
    .maybeSingle();

  if (!offre || !offre.email_contact) {
    return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });
  }

  let pieceJointe: { filename: string; content: string } | undefined;
  if (typeof cvBase64 === "string") {
    const correspondance = cvBase64.match(/^data:application\/pdf;base64,(.+)$/);
    if (!correspondance) {
      return NextResponse.json({ error: "Le CV doit être un fichier PDF." }, { status: 400 });
    }
    if (Buffer.from(correspondance[1], "base64").byteLength > TAILLE_MAX_CV) {
      return NextResponse.json({ error: "Le CV est trop volumineux (4 Mo max)." }, { status: 400 });
    }
    pieceJointe = {
      filename: (cvNomFichier as string) || "cv.pdf",
      content: correspondance[1],
    };
  }

  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactCandidat);

  try {
    await envoyerEmail({
      a: offre.email_contact,
      sujet: `Candidature pour "${offre.poste}" — ${offre.nom_commerce}`,
      html: `
        <p>Vous avez reçu une nouvelle candidature via Ici on recrute pour l'offre <strong>${offre.poste}</strong>.</p>
        <p><strong>Nom :</strong> ${nomCandidat}</p>
        <p><strong>Contact :</strong> ${contactCandidat}</p>
        ${message ? `<p><strong>Message :</strong><br/>${String(message).replace(/\n/g, "<br/>")}</p>` : ""}
      `,
      repondreA: emailValide ? contactCandidat : undefined,
      pieceJointe,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  await supabase.from("depots_ip").insert({ ip });
  await supabase.from("evenements").insert({
    type: "candidature",
    origine: "site",
    ville_id: offre.ville_id,
    offre_type: "commercant",
    offre_id: offre.id,
  });

  return NextResponse.json({ ok: true });
}
