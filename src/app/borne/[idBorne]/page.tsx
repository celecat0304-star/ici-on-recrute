import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import BorneClient from "@/components/borne/BorneClient";
import type { OffreAffichee } from "@/lib/types";

export default async function BornePage({
  params,
}: {
  params: Promise<{ idBorne: string }>;
}) {
  const { idBorne } = await params;
  const supabase = createPublicClient();

  const { data: borne } = await supabase
    .from("bornes")
    .select("id, nom, lieu, ville_id, villes ( nom, slug )")
    .eq("id", idBorne)
    .single();

  if (!borne) notFound();

  const villeRelation = borne.villes as unknown as
    | { nom: string; slug: string }
    | { nom: string; slug: string }[]
    | null;
  const ville = Array.isArray(villeRelation) ? villeRelation[0] : villeRelation;

  const [{ data: offresFranceTravail }, { data: offresCommercants }] =
    await Promise.all([
      supabase
        .from("offres_france_travail")
        .select(
          "id, id_france_travail, ville_id, intitule, description, entreprise_nom, type_contrat, duree_travail, lieu_travail, url_origine, date_publication, date_maj"
        )
        .eq("ville_id", borne.ville_id)
        .order("date_publication", { ascending: false }),
      supabase
        .from("offres_commercants")
        .select(
          "id, ville_id, nom_commerce, poste, type_contrat, temps_travail, horaires, quartier, description, comment_postuler, image_url"
        )
        .eq("ville_id", borne.ville_id)
        .eq("statut", "publiee")
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

  return (
    <BorneClient
      borne={{ id: borne.id, nom: borne.nom, lieu: borne.lieu }}
      villeNom={ville?.nom ?? ""}
      villeSlug={ville?.slug ?? ""}
      offres={offres}
      offresCommercantsCount={offresCommercants?.length ?? 0}
    />
  );
}
