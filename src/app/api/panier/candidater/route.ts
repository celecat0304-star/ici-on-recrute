import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerEmail } from "@/lib/resend";

export const maxDuration = 60;

const LIMITE_PAR_HEURE = 5;
const TAILLE_MAX_CV = 4 * 1024 * 1024;

const echapper = (t: string) =>
  t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    panierId,
    prenom,
    nom,
    email,
    telephone,
    message,
    cvBase64,
    cvNomFichier,
    consentement,
    siteWeb, // piège à robots
    captchaA,
    captchaB,
    captchaReponse,
  } = body ?? {};

  if (siteWeb) return NextResponse.json({ ok: true });

  if (Number(captchaA) + Number(captchaB) !== Number(captchaReponse)) {
    return NextResponse.json({ error: "Réponse anti-robot incorrecte." }, { status: 400 });
  }

  if (!panierId || !prenom?.trim() || !nom?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: "Merci de remplir tous les champs obligatoires." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail invalide." }, { status: 400 });
  }
  if (consentement !== true) {
    return NextResponse.json(
      { error: "Merci d'accepter la transmission de vos coordonnées aux commerçants." },
      { status: 400 }
    );
  }
  if (
    String(prenom).length > 100 ||
    String(nom).length > 100 ||
    String(telephone ?? "").length > 30 ||
    String(message ?? "").length > 1500
  ) {
    return NextResponse.json({ error: "Un des champs est trop long." }, { status: 400 });
  }

  let pieceJointe: { filename: string; content: string } | undefined;
  if (typeof cvBase64 === "string" && cvBase64) {
    const m = cvBase64.match(/^data:application\/pdf;base64,(.+)$/);
    if (!m) return NextResponse.json({ error: "Le CV doit être un fichier PDF." }, { status: 400 });
    if (Buffer.from(m[1], "base64").byteLength > TAILLE_MAX_CV) {
      return NextResponse.json({ error: "Le CV est trop volumineux (4 Mo max)." }, { status: 400 });
    }
    pieceJointe = {
      filename: String(cvNomFichier || "cv.pdf").replace(/[^\w.\- ]/g, "_"),
      content: m[1],
    };
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "inconnu";
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

  // Les offres de commerçants du panier qui acceptent les candidatures
  const { data: lignes } = await supabase
    .from("panier_offres")
    .select("offre_id")
    .eq("panier_id", panierId)
    .eq("offre_type", "commercant");
  const ids = (lignes ?? []).map((l) => l.offre_id);

  const { data: offres } =
    ids.length > 0
      ? await supabase
          .from("offres_commercants")
          .select("id, ville_id, nom_commerce, poste, email_contact")
          .in("id", ids)
          .eq("statut", "publiee")
          .gte("date_expiration", new Date().toISOString().slice(0, 10))
      : { data: [] };

  const destinataires = (offres ?? []).filter((o) => o.email_contact);
  if (destinataires.length === 0) {
    return NextResponse.json(
      { error: "Aucune offre de commerçant de ce panier n'accepte de candidature en ligne." },
      { status: 404 }
    );
  }

  const nomComplet = `${String(prenom).trim()} ${String(nom).trim()}`;
  const contenu = `
    <p><strong>Nom :</strong> ${echapper(nomComplet)}</p>
    <p><strong>E-mail :</strong> ${echapper(String(email).trim())}</p>
    ${telephone ? `<p><strong>Téléphone :</strong> ${echapper(String(telephone))}</p>` : ""}
    ${message ? `<p><strong>Message :</strong><br/>${echapper(String(message)).replace(/\n/g, "<br/>")}</p>` : ""}
  `;

  const reussies: typeof destinataires = [];
  for (const offre of destinataires) {
    try {
      await envoyerEmail({
        a: offre.email_contact!,
        sujet: `Candidature pour "${offre.poste}" — ${offre.nom_commerce}`,
        html: `<p>Vous avez reçu une nouvelle candidature via Ici on recrute pour l'offre <strong>${echapper(offre.poste)}</strong>.</p>${contenu}`,
        repondreA: String(email).trim(),
        pieceJointe,
      });
      reussies.push(offre);
    } catch (err) {
      console.error("Échec envoi candidature commune :", err);
    }
    // l'envoi d'e-mails est limité à quelques messages par seconde
    await pause(700);
  }

  if (reussies.length === 0) {
    return NextResponse.json(
      { error: "L'envoi a échoué, merci de réessayer dans un instant." },
      { status: 500 }
    );
  }

  // Récapitulatif pour le candidat (sans bloquer si l'envoi échoue)
  try {
    await envoyerEmail({
      a: String(email).trim(),
      sujet: "Votre candidature a bien été envoyée — Ici on recrute",
      html: `
        <p>Bonjour ${echapper(String(prenom).trim())},</p>
        <p>Votre candidature a été envoyée à ${reussies.length} commerçant${reussies.length > 1 ? "s" : ""} :</p>
        <ul>${reussies.map((o) => `<li>${echapper(o.poste)} — ${echapper(o.nom_commerce)}</li>`).join("")}</ul>
        <p>Ils vous répondront directement à cette adresse.</p>
      `,
    });
  } catch (err) {
    console.error("Échec envoi récapitulatif candidat :", err);
  }

  await supabase.from("depots_ip").insert({ ip });
  await supabase.from("candidatures_communes").insert({
    panier_id: panierId,
    prenom: String(prenom).trim(),
    nom: String(nom).trim(),
    email: String(email).trim(),
    telephone: telephone ? String(telephone) : null,
    message: message ? String(message) : null,
    cv_nom: pieceJointe?.filename ?? null,
    nb_destinataires: reussies.length,
  });
  await supabase.from("evenements").insert(
    reussies.map((o) => ({
      type: "candidature",
      origine: "site",
      ville_id: o.ville_id,
      offre_type: "commercant",
      offre_id: o.id,
    }))
  );

  return NextResponse.json({
    ok: true,
    envoyees: reussies.length,
    echecs: destinataires.length - reussies.length,
  });
}
