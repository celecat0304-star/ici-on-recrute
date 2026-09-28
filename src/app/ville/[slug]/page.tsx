import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { estGrandeEntreprise } from "@/lib/franceTravail";
import VilleListe from "@/components/ville/VilleListe";
import HeaderHorloge from "@/components/ville/HeaderHorloge";
import {
  IconeMallette,
  IconePin,
  IconeGroupe,
  IconeEtoile,
  IconeDocument,
  IconePiece,
  IconeGlobe,
  IconeAccessibilite,
  IconeChevron,
  IconeBlason,
} from "@/components/icones/Icones";
import type { OffreAffichee } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createPublicClient();
  const { data: ville } = await supabase
    .from("villes")
    .select("nom")
    .eq("slug", slug)
    .maybeSingle();

  if (!ville) return {};

  return {
    title: `Offres d'emploi à ${ville.nom} — Ici on recrute`,
    description: `Toutes les offres d'emploi locales à ${ville.nom} : offres France Travail et offres des commerçants du coin.`,
  };
}

function champsOffre(offre: OffreAffichee) {
  if (offre.source === "commercant") {
    return {
      titre: offre.poste,
      sousTitre: offre.nom_commerce,
      lieu: offre.quartier,
      contrat: offre.type_contrat,
      photo: offre.image_url,
      logo: null as string | null,
      description: offre.description,
    };
  }
  return {
    titre: offre.intitule,
    sousTitre: offre.entreprise_nom,
    lieu: offre.lieu_travail,
    contrat: offre.type_contrat,
    photo: null as string | null,
    logo: offre.entreprise_logo_url,
    description: offre.description,
  };
}

export default async function VillePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: ville } = await supabase
    .from("villes")
    .select("id, nom, slug, logo_url, photo_hero_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!ville) notFound();

  const [{ data: offresFranceTravail }, { data: offresCommercants }] =
    await Promise.all([
      supabase
        .from("offres_france_travail")
        .select(
          "id, id_france_travail, ville_id, intitule, description, entreprise_nom, entreprise_logo_url, type_contrat, duree_travail, lieu_travail, url_origine, date_publication, date_maj, tranche_effectif"
        )
        .eq("ville_id", ville.id)
        .order("date_publication", { ascending: false }),
      supabase
        .from("offres_commercants")
        .select(
          "id, ville_id, nom_commerce, poste, type_contrat, temps_travail, horaires, quartier, description, comment_postuler, image_url, image_source, pexels_photographe, categorie, abonnement_actif"
        )
        .eq("ville_id", ville.id)
        .eq("statut", "publiee")
        .gte("date_expiration", new Date().toISOString().slice(0, 10))
        .order("created_at", { ascending: false }),
    ]);

  const offresCommercantsAffichees: OffreAffichee[] = (offresCommercants ?? []).map(
    (o): OffreAffichee => ({ source: "commercant", ...o })
  );
  const offresFranceTravailAffichees: OffreAffichee[] = (offresFranceTravail ?? []).map(
    (o): OffreAffichee => ({ source: "france_travail", ...o })
  );

  const offres: OffreAffichee[] = [
    ...offresCommercantsAffichees,
    ...offresFranceTravailAffichees,
  ];

  const utilisePexels = (offresCommercants ?? []).some(
    (o) => o.image_source === "pexels"
  );

  // Offre à la une : grande entreprise abonnée en priorité, sinon une grande
  // entreprise France Travail, sinon la première offre disponible.
  const entreprisesPayantes = offresCommercantsAffichees.filter(
    (o) => o.source === "commercant" && o.categorie === "entreprise" && o.abonnement_actif
  );
  const grandesEntreprisesFT = offresFranceTravailAffichees.filter(
    (o) => o.source === "france_travail" && estGrandeEntreprise(o.tranche_effectif)
  );
  const offreVedette = entreprisesPayantes[0] ?? grandesEntreprisesFT[0] ?? offres[0];
  const vedette = offreVedette ? champsOffre(offreVedette) : null;

  return (
    <div className="min-h-screen bg-fond text-texte flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <div>
          <p className="font-title text-xl font-black leading-none">
            ICI <span className="text-vert">✌</span>
            <br />
            ON RECRUTE
          </p>
          <p className="text-xs opacity-60 mt-1">Les emplois près de chez vous</p>
        </div>
        <HeaderHorloge />
      </header>

      <section
        className="relative px-6 pt-10 pb-24 overflow-hidden"
        style={
          ville.photo_hero_url
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(241,245,249,0.55), var(--color-fond) 92%), url(${ville.photo_hero_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                background:
                  "linear-gradient(180deg, #dbeafe, var(--color-fond) 92%)",
              }
        }
      >
        <div className="max-w-5xl mx-auto">
          <h1 className="font-title text-4xl sm:text-5xl font-black leading-tight">
            Trouvez un emploi
            <br />
            <span className="text-jaune">à {ville.nom}</span>
          </h1>
        </div>

        <div className="max-w-5xl mx-auto mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatPill Icone={IconeMallette} texte="Des offres locales et à jour" />
          <StatPill Icone={IconePin} texte="Tous les secteurs d'activité" />
          <StatPill Icone={IconeGroupe} texte="CDI, CDD, Intérim, Alternance" />
        </div>
      </section>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 -mt-14 flex flex-col gap-8 pb-16">
        {vedette && (
          <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-black/5 overflow-hidden grid sm:grid-cols-2">
            <div className="relative min-h-[180px] bg-vert/90 flex items-center justify-center">
              {vedette.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vedette.photo} alt="" className="w-full h-full object-cover" />
              ) : vedette.logo ? (
                <div className="bg-white rounded-xl p-4 m-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={vedette.logo} alt="" className="max-h-20 object-contain" />
                </div>
              ) : (
                <IconeMallette className="w-16 h-16 text-white/70" />
              )}
              <span className="absolute top-4 left-4 flex items-center gap-1 bg-texte/90 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                <IconeEtoile className="w-3.5 h-3.5 text-jaune" />
                OFFRE À LA UNE
              </span>
            </div>
            <div className="p-6 flex flex-col gap-3">
              {vedette.sousTitre && (
                <p className="font-bold text-sm opacity-70">{vedette.sousTitre}</p>
              )}
              <h2 className="font-title text-2xl font-bold leading-tight">
                {vedette.titre}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-70">
                {vedette.lieu && (
                  <span className="flex items-center gap-1">
                    <IconePin className="w-4 h-4" /> {vedette.lieu}
                  </span>
                )}
                {vedette.contrat && (
                  <span className="flex items-center gap-1">
                    <IconeDocument className="w-4 h-4" /> {vedette.contrat}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <IconePiece className="w-4 h-4" /> Selon profil
                </span>
              </div>
              {vedette.description && (
                <p className="text-sm opacity-80 line-clamp-2">
                  {vedette.description}
                </p>
              )}
              <Link
                href={`/ville/${ville.slug}/offres/${offreVedette!.id}`}
                className="mt-2 inline-flex items-center justify-center gap-2 bg-vert text-white font-bold rounded-xl px-6 py-3 shadow-lg shadow-vert/20 hover:-translate-y-0.5"
              >
                Voir l&apos;offre <IconeChevron className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p>
            <span className="font-title text-4xl font-black text-jaune">
              {offres.length}
            </span>{" "}
            <span className="font-bold">offres disponibles aujourd&apos;hui</span>
          </p>
          <a
            href="#offres"
            className="flex items-center gap-1 border-2 border-vert text-vert font-bold rounded-full px-5 py-2.5 hover:bg-vert hover:text-white"
          >
            Voir toutes les offres <IconeChevron className="w-4 h-4" />
          </a>
        </div>

        <VilleListe offres={offres} villeSlug={ville.slug} />

        <Link
          href="/commercant"
          className="block bg-jaune text-texte rounded-xl px-6 py-4 font-bold text-center shadow-lg shadow-jaune/20 hover:shadow-xl hover:-translate-y-0.5"
        >
          Vous recrutez ? Publier une offre
        </Link>
      </main>

      <footer className="border-t border-black/5 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-sm">
          <p className="flex items-center gap-2 opacity-80">
            <IconeBlason className="w-5 h-5 text-vert" />
            Une initiative de votre ville — {ville.nom}
          </p>
          <p className="opacity-60">En partenariat avec France Travail</p>
          <div className="flex gap-2">
            <span className="flex items-center gap-1 border border-black/10 rounded-full px-3 py-1.5 opacity-70">
              <IconeGlobe className="w-4 h-4" /> Français
            </span>
            <span className="flex items-center gap-1 border border-black/10 rounded-full px-3 py-1.5 opacity-70">
              <IconeAccessibilite className="w-4 h-4" /> Accessibilité
            </span>
          </div>
        </div>
        {utilisePexels && (
          <p className="text-center text-xs opacity-50 pb-4">
            Photos fournies par Pexels
          </p>
        )}
      </footer>
    </div>
  );
}

function StatPill({
  Icone,
  texte,
}: {
  Icone: typeof IconeMallette;
  texte: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-md shadow-black/5 border border-black/5 px-4 py-3 flex items-center gap-3">
      <span className="shrink-0 w-9 h-9 rounded-full bg-vert/10 text-vert flex items-center justify-center">
        <Icone className="w-4.5 h-4.5" />
      </span>
      <p className="text-sm font-bold leading-snug">{texte}</p>
    </div>
  );
}
