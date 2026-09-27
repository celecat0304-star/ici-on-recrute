import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import CandidatureForm from "@/components/ville/CandidatureForm";

export const dynamic = "force-dynamic";

async function chargerOffre(villeId: string, id: string) {
  const supabase = createPublicClient();

  const { data: offreCommercant } = await supabase
    .from("offres_commercants")
    .select(
      "id, ville_id, nom_commerce, poste, type_contrat, temps_travail, horaires, quartier, description, comment_postuler, email_contact, image_url, image_source, pexels_photographe"
    )
    .eq("id", id)
    .eq("ville_id", villeId)
    .eq("statut", "publiee")
    .gte("date_expiration", new Date().toISOString().slice(0, 10))
    .maybeSingle();

  if (offreCommercant) {
    return { source: "commercant" as const, offre: offreCommercant };
  }

  const { data: offreFranceTravail } = await supabase
    .from("offres_france_travail")
    .select(
      "id, ville_id, intitule, description, entreprise_nom, entreprise_logo_url, type_contrat, duree_travail, lieu_travail, url_origine, date_publication"
    )
    .eq("id", id)
    .eq("ville_id", villeId)
    .maybeSingle();

  if (offreFranceTravail) {
    return { source: "france_travail" as const, offre: offreFranceTravail };
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  const supabase = createPublicClient();
  const { data: ville } = await supabase
    .from("villes")
    .select("id, nom")
    .eq("slug", slug)
    .maybeSingle();
  if (!ville) return {};

  const resultat = await chargerOffre(ville.id, id);
  if (!resultat) return {};

  const titre =
    resultat.source === "commercant" ? resultat.offre.poste : resultat.offre.intitule;

  return { title: `${titre} à ${ville.nom} — Ici on recrute` };
}

export default async function OffreDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = createPublicClient();

  const { data: ville } = await supabase
    .from("villes")
    .select("id, nom, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!ville) notFound();

  const resultat = await chargerOffre(ville.id, id);
  if (!resultat) notFound();

  const { source, offre } = resultat;

  await supabase.from("evenements").insert({
    type: "vue_site",
    origine: "site",
    ville_id: ville.id,
    offre_type: source,
    offre_id: offre.id,
  });

  const titre = source === "commercant" ? offre.poste : offre.intitule;
  const sousTitre = source === "commercant" ? offre.nom_commerce : offre.entreprise_nom;
  const lieu = source === "commercant" ? offre.quartier : offre.lieu_travail;
  const tempsTravail =
    source === "commercant" ? offre.temps_travail : offre.duree_travail;

  return (
    <div className="min-h-screen bg-fond-sombre text-texte-sombre flex flex-col">
      <header className="px-6 py-6 border-b border-white/10">
        <div className="max-w-2xl mx-auto">
          <Link
            href={`/ville/${slug}`}
            className="opacity-70 hover:opacity-100 hover:text-vert-clair inline-flex items-center gap-1"
          >
            ← Retour aux offres de {ville.nom}
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 flex flex-col gap-4">
        {source === "commercant" && offre.image_url && (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={offre.image_url}
              alt=""
              className="w-full max-h-80 object-cover rounded-xl"
            />
            {offre.image_source === "pexels" && offre.pexels_photographe && (
              <p className="text-sm opacity-60 mt-1">
                Photo : {offre.pexels_photographe} / Pexels
              </p>
            )}
          </div>
        )}

        {source === "france_travail" && offre.entreprise_logo_url && (
          <div className="w-full max-h-40 flex items-center justify-center bg-white rounded-xl p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={offre.entreprise_logo_url}
              alt=""
              className="max-h-32 max-w-full object-contain"
            />
          </div>
        )}

        {offre.type_contrat && (
          <span className="self-start bg-jaune text-texte font-bold px-4 py-2 rounded-full shadow-md shadow-jaune/10">
            {offre.type_contrat}
          </span>
        )}
        <h1 className="font-title text-3xl font-bold leading-tight">{titre}</h1>
        {sousTitre && <p className="text-xl opacity-80">{sousTitre}</p>}
        <p className="opacity-60">
          {[lieu, tempsTravail].filter(Boolean).join(" · ")}
        </p>

        {offre.description && (
          <p className="whitespace-pre-line mt-2 leading-relaxed opacity-90">
            {offre.description}
          </p>
        )}

        {source === "commercant" ? (
          <>
            <div className="bg-surface-sombre border border-white/10 rounded-xl p-5 mt-4">
              <p className="font-bold mb-1 text-vert-clair">Comment postuler ?</p>
              <p>{offre.comment_postuler}</p>
            </div>
            {offre.email_contact && <CandidatureForm offreId={offre.id} />}
          </>
        ) : (
          <a
            href={offre.url_origine}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block bg-vert text-white font-bold rounded-xl px-6 py-4 text-center shadow-lg shadow-vert/10 hover:shadow-xl hover:shadow-vert/20 hover:-translate-y-0.5"
          >
            Postuler sur France Travail
          </a>
        )}

        <p className="text-sm opacity-50 mt-4">
          Source : {source === "commercant" ? "Commerçant du coin" : "France Travail"}
        </p>
      </main>
    </div>
  );
}
