import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { estGrandeEntreprise } from "@/lib/franceTravail";
import VilleListe from "@/components/ville/VilleListe";
import { imageIllustration, themeDeOffre } from "@/lib/imagesThemes";
import { Logo, LogoFranceTravail } from "@/components/borne/BorneComposants";
import {
  capitaliser,
  champsAffichage,
  initiales,
  nettoyerLieu,
} from "@/components/borne/borneUtils";
import {
  IconeMallette,
  IconePin,
  IconeGroupe,
  IconeEtoile,
  IconeDocument,
  IconePiece,
  IconeChevron,
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
    title: `Offres d'emploi à ${capitaliser(ville.nom)} — Ici on recrute`,
    description: `Toutes les offres d'emploi locales à ${capitaliser(ville.nom)} : offres France Travail et offres des commerçants du coin.`,
  };
}

const TEINTES = ["#0F1A45", "#0E8A4A", "#2B3BE0", "#8A4200", "#7A2E6E", "#3B4152"];

function teinte(texte: string) {
  let h = 0;
  for (let i = 0; i < texte.length; i++) h = (h * 31 + texte.charCodeAt(i)) >>> 0;
  return TEINTES[h % TEINTES.length];
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
    .select("id, nom, slug, code_postal, logo_url, photo_hero_url")
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

  const villeAffichee = capitaliser(ville.nom);
  const departement = String(ville.code_postal ?? "").slice(0, 2) || undefined;

  // Offre à la une : grande entreprise abonnée en priorité, sinon une grande
  // entreprise France Travail, sinon la première offre disponible.
  const entreprisesPayantes = offresCommercantsAffichees.filter(
    (o) => o.source === "commercant" && o.categorie === "entreprise" && o.abonnement_actif
  );
  const grandesEntreprisesFT = offresFranceTravailAffichees.filter(
    (o) => o.source === "france_travail" && estGrandeEntreprise(o.tranche_effectif)
  );
  const offreVedette = entreprisesPayantes[0] ?? grandesEntreprisesFT[0] ?? offres[0];
  const vedette = offreVedette ? champsAffichage(offreVedette) : null;

  const utilisePexels = (offresCommercants ?? []).some((o) => o.image_source === "pexels");
  const nomVedette = vedette ? vedette.sousTitre || vedette.titre : "";
  const aPhotoVedette = Boolean(vedette?.imageUrl && !vedette.estLogo);
  const aLogoVedette = Boolean(vedette?.imageUrl && vedette.estLogo);
  // Une photo d'illustration seulement quand le métier est reconnu ; sinon l'initiale de l'entreprise.
  const illustrationVedette =
    vedette && offreVedette && !aPhotoVedette && !aLogoVedette &&
    themeDeOffre(vedette.titre, vedette.sousTitre) !== "general"
      ? imageIllustration(vedette.titre, vedette.sousTitre, offreVedette.id)
      : null;
  const lieuVedette = vedette ? nettoyerLieu(vedette.lieu, departement) : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F5F0] text-[#0F1A45]">
      <div className="relative">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          {ville.photo_hero_url ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${ville.photo_hero_url})`,
                filter: "brightness(1.08) saturate(1.1)",
              }}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, #dbeafe, #F7F5F0)" }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(247,245,240,0.25) 0%, rgba(247,245,240,0.4) 50%, #F7F5F0 95%)",
            }}
          />
        </div>

        <header className="relative z-10 mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-5 sm:h-20 sm:px-6">
          <span className="sm:hidden">
            <Logo taille={22} />
          </span>
          <span className="hidden sm:block">
            <Logo taille={30} />
          </span>
          {ville.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ville.logo_url}
              alt={`Logo de ${villeAffichee}`}
              className="h-9 w-auto max-w-[130px] object-contain sm:h-12 sm:max-w-[170px]"
            />
          )}
        </header>

        <section className="relative z-10 mx-auto w-full max-w-[1120px] px-5 pb-20 pt-4 sm:px-6 sm:pb-24 sm:pt-10">
          <h1 className="font-title text-[44px] font-extrabold leading-[1.02] tracking-tight sm:text-[88px]">
            Trouvez un emploi
            <br />
            <span className="text-[#0E8A4A]">à {villeAffichee}</span>
          </h1>

          <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-3">
            <Pastille Icone={IconeMallette} texte="Des offres locales et à jour" />
            <Pastille Icone={IconePin} texte="Tous les secteurs d'activité" />
            <Pastille Icone={IconeGroupe} texte="CDI, CDD, Intérim, Alternance" />
          </div>
        </section>
      </div>

      <main className="relative z-20 mx-auto -mt-14 flex w-full max-w-[1120px] flex-1 flex-col gap-6 px-5 pb-12 sm:px-6">
        {vedette && offreVedette && (
          <div className="grid overflow-hidden rounded-[24px] bg-white shadow-[0_24px_60px_rgba(15,26,69,0.18)] sm:grid-cols-2">
            <div
              className="relative flex aspect-video items-center justify-center sm:aspect-auto sm:min-h-[280px]"
              style={{ background: "#F1F4F9" }}
            >
              {aPhotoVedette ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vedette.imageUrl!} alt="" className="h-full w-full object-cover" />
              ) : aLogoVedette ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={vedette.imageUrl!}
                  alt={vedette.imageAlt}
                  className="object-contain"
                  style={{ width: "70%", maxHeight: "70%" }}
                />
              ) : illustrationVedette ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={illustrationVedette.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span
                  className="font-title flex h-24 w-24 items-center justify-center rounded-[24px] text-5xl font-bold text-white"
                  style={{ background: teinte(nomVedette) }}
                >
                  {initiales(nomVedette).charAt(0)}
                </span>
              )}
              <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-[#0F1A45] px-3 py-1.5 text-sm font-bold text-white">
                <IconeEtoile className="h-3.5 w-3.5 text-[#0E8A4A]" />
                OFFRE À LA UNE
              </span>
            </div>
            <div className="flex flex-col gap-3 p-5 sm:p-6">
              {vedette.sousTitre && (
                <p className="text-sm font-semibold uppercase tracking-wide text-[#545A6B]">
                  {vedette.sousTitre}
                </p>
              )}
              <h2 className="font-title text-[28px] font-bold leading-tight sm:text-3xl">
                {vedette.titre}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[15px] text-[#3B4152]">
                {lieuVedette && (
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <IconePin className="h-4 w-4" /> {lieuVedette}
                  </span>
                )}
                {vedette.contratNom && (
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <IconeDocument className="h-4 w-4" />{" "}
                    {[vedette.contratNom, vedette.contratDuree].filter(Boolean).join(" · ")}
                  </span>
                )}
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <IconePiece className="h-4 w-4" /> Selon profil
                </span>
              </div>
              {vedette.description && (
                <p className="line-clamp-2 text-sm text-[#3B4152]">{vedette.description}</p>
              )}
              <Link
                href={`/ville/${ville.slug}/offres/${offreVedette.id}`}
                className="mt-1 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#2B3BE0] text-lg font-bold text-white shadow-lg shadow-[#2B3BE0]/20"
              >
                Voir l&apos;offre <IconeChevron className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        <section className="flex flex-col items-center gap-4 rounded-[24px] bg-[#0F1A45] px-6 py-6 text-center text-white sm:flex-row sm:justify-between sm:px-8 sm:text-left">
          <h2 className="font-title text-2xl font-bold">Vous recrutez à {villeAffichee} ?</h2>
          <Link
            href="/commercant"
            className="inline-flex h-[52px] w-full items-center justify-center rounded-xl bg-[#0E8A4A] px-8 text-lg font-bold text-white sm:w-auto"
          >
            Publier une offre
          </Link>
        </section>

        <div className="flex flex-col items-start gap-4">
          <div className="flex items-center gap-3">
            <span className="font-title text-[56px] font-extrabold leading-none tracking-tight text-[#0E8A4A]">
              {offres.length}
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-xl font-bold leading-tight">
                offres disponibles
                <br />
                aujourd&apos;hui
              </span>
              <span className="flex items-center gap-2 text-sm font-semibold text-[#0E8A4A]">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="bc-ping absolute inset-0 rounded-full bg-[#0E8A4A]" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-[#0E8A4A]" />
                </span>
                en direct
              </span>
            </div>
          </div>
          <a
            href="#offres"
            className="flex h-12 items-center gap-1 rounded-full border-2 border-[#2B3BE0] bg-white px-5 font-bold text-[#2B3BE0]"
          >
            Voir toutes les offres <IconeChevron className="h-4 w-4" />
          </a>
        </div>

        <VilleListe offres={offres} villeSlug={ville.slug} departement={departement} />
      </main>

      <footer className="border-t border-[#E4E0D6] bg-white">
        <div className="mx-auto flex w-full max-w-[1120px] items-end justify-between gap-4 px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-[#3B4152]">Une initiative de votre ville</span>
            {ville.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ville.logo_url}
                alt={`Logo de ${villeAffichee}`}
                className="h-12 w-auto max-w-[180px] object-contain object-left"
              />
            ) : (
              <span className="font-title text-2xl font-bold">{villeAffichee}</span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-sm text-[#3B4152]">En partenariat avec</span>
            <LogoFranceTravail />
          </div>
        </div>
        {(utilisePexels || illustrationVedette) && (
          <p className="pb-4 text-center text-sm text-[#545A6B]">Photos d&apos;illustration : Pexels</p>
        )}
      </footer>
    </div>
  );
}

function Pastille({
  Icone,
  texte,
}: {
  Icone: typeof IconeMallette;
  texte: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-3 sm:rounded-xl sm:border sm:border-[#E4E0D6] sm:bg-white sm:px-4 sm:py-3 sm:text-left sm:shadow-md sm:shadow-black/5">
      <span className="flex shrink-0 items-center justify-center text-[#2B3BE0] sm:h-10 sm:w-10 sm:rounded-full sm:bg-[#2B3BE0]/10">
        <Icone className="h-8 w-8 sm:h-5 sm:w-5" />
      </span>
      <p className="text-sm font-bold leading-snug">{texte}</p>
    </div>
  );
}
