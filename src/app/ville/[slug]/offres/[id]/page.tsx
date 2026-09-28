import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import CandidatureForm from "@/components/ville/CandidatureForm";
import {
  IconePin,
  IconeDocument,
  IconeCalendrier,
  IconeChevron,
  IconeMallette,
} from "@/components/icones/Icones";

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
    <div className="min-h-screen bg-fond text-texte flex flex-col">
      <header className="px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <Link
            href={`/ville/${slug}#offres`}
            className="inline-flex items-center gap-2 font-bold text-sm opacity-70 hover:opacity-100 hover:text-vert"
          >
            <IconeChevron className="w-4 h-4 rotate-180" />
            Retour aux offres de {ville.nom}
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 pb-16 flex flex-col gap-5">
        <div className="rounded-2xl overflow-hidden bg-vert/90 min-h-[200px] flex items-center justify-center relative">
          {source === "commercant" && offre.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={offre.image_url}
              alt=""
              className="w-full h-full max-h-80 object-cover"
            />
          ) : source === "france_travail" && offre.entreprise_logo_url ? (
            <div className="bg-white rounded-xl p-4 m-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={offre.entreprise_logo_url}
                alt=""
                className="max-h-24 max-w-full object-contain"
              />
            </div>
          ) : (
            <IconeMallette className="w-16 h-16 text-white/70" />
          )}
        </div>
        {source === "commercant" &&
          offre.image_source === "pexels" &&
          offre.pexels_photographe && (
            <p className="text-xs opacity-50 -mt-3">
              Photo : {offre.pexels_photographe} / Pexels
            </p>
          )}

        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6 flex flex-col gap-3">
          {sousTitre && <p className="font-bold text-sm opacity-70">{sousTitre}</p>}
          <h1 className="font-title text-2xl sm:text-3xl font-bold leading-tight">
            {titre}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm opacity-70">
            {offre.type_contrat && (
              <span className="flex items-center gap-1 bg-jaune text-texte font-bold px-3 py-1.5 rounded-full text-xs">
                <IconeDocument className="w-3.5 h-3.5" />
                {offre.type_contrat}
              </span>
            )}
            {tempsTravail && (
              <span className="flex items-center gap-1">
                <IconeCalendrier className="w-4 h-4" />
                {tempsTravail}
              </span>
            )}
            {lieu && (
              <span className="flex items-center gap-1">
                <IconePin className="w-4 h-4" />
                {lieu}
              </span>
            )}
          </div>

          {offre.description && (
            <p className="whitespace-pre-line mt-2 leading-relaxed opacity-90">
              {offre.description}
            </p>
          )}
        </div>

        {source === "commercant" ? (
          <>
            <div className="bg-white border border-black/5 shadow-sm rounded-2xl p-5">
              <p className="font-bold mb-1 text-vert">Comment postuler ?</p>
              <p>{offre.comment_postuler}</p>
            </div>
            {offre.email_contact && <CandidatureForm offreId={offre.id} />}
          </>
        ) : (
          <a
            href={offre.url_origine}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-vert text-white font-bold rounded-xl px-6 py-4 text-center shadow-lg shadow-vert/20 hover:-translate-y-0.5"
          >
            Postuler sur France Travail <IconeChevron className="w-4 h-4" />
          </a>
        )}

        <p className="text-sm opacity-50">
          Source : {source === "commercant" ? "Commerçant du coin" : "France Travail"}
        </p>
      </main>
    </div>
  );
}
