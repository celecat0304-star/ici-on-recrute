import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import VilleListe from "@/components/ville/VilleListe";
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

export default async function VillePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: ville } = await supabase
    .from("villes")
    .select("id, nom, slug, logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!ville) notFound();

  const [{ data: offresFranceTravail }, { data: offresCommercants }] =
    await Promise.all([
      supabase
        .from("offres_france_travail")
        .select(
          "id, id_france_travail, ville_id, intitule, description, entreprise_nom, type_contrat, duree_travail, lieu_travail, url_origine, date_publication, date_maj"
        )
        .eq("ville_id", ville.id)
        .order("date_publication", { ascending: false }),
      supabase
        .from("offres_commercants")
        .select(
          "id, ville_id, nom_commerce, poste, type_contrat, temps_travail, horaires, quartier, description, comment_postuler, image_url, image_source, pexels_photographe"
        )
        .eq("ville_id", ville.id)
        .eq("statut", "publiee")
        .gte("date_expiration", new Date().toISOString().slice(0, 10))
        .order("created_at", { ascending: false }),
    ]);

  const offres: OffreAffichee[] = [
    ...(offresCommercants ?? []).map(
      (o): OffreAffichee => ({ source: "commercant", ...o })
    ),
    ...(offresFranceTravail ?? []).map(
      (o): OffreAffichee => ({ source: "france_travail", ...o })
    ),
  ];

  const utilisePexels = (offresCommercants ?? []).some(
    (o) => o.image_source === "pexels"
  );

  return (
    <div className="min-h-screen bg-fond-sombre text-texte-sombre flex flex-col">
      <header className="px-6 py-8 border-b border-white/10">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          <h1 className="font-title text-4xl font-bold">Ici on recrute</h1>
          <p className="text-xl opacity-80">à {ville.nom}</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full px-6">
        <Link
          href="/commercant"
          className="block mt-6 bg-jaune text-texte rounded-xl px-6 py-4 font-bold text-center hover:opacity-90"
        >
          Vous recrutez ? Publier une offre
        </Link>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        <VilleListe offres={offres} villeSlug={ville.slug} />
      </main>

      <footer className="px-6 py-8 border-t border-white/10 text-sm opacity-60 text-center">
        {utilisePexels && <p className="mb-2">Photos fournies par Pexels</p>}
        <p>
          Offres France Travail mises à jour automatiquement. Offres
          commerçants vérifiées avant publication.
        </p>
      </footer>
    </div>
  );
}
