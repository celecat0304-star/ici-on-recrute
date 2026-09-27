import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import BorneClient from "@/components/borne/BorneClient";
import { estGrandeEntreprise } from "@/lib/franceTravail";
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
          "id, id_france_travail, ville_id, intitule, description, entreprise_nom, entreprise_logo_url, type_contrat, duree_travail, lieu_travail, url_origine, date_publication, date_maj, tranche_effectif"
        )
        .eq("ville_id", borne.ville_id)
        .order("date_publication", { ascending: false }),
      supabase
        .from("offres_commercants")
        .select(
          "id, ville_id, nom_commerce, poste, type_contrat, temps_travail, horaires, quartier, description, comment_postuler, image_url, image_source, pexels_photographe, categorie, abonnement_actif"
        )
        .eq("ville_id", borne.ville_id)
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

  // Case A : grande entreprise qui paie pour être mise en avant
  const entreprisesPayantes = offresCommercantsAffichees.filter(
    (o) => o.source === "commercant" && o.categorie === "entreprise" && o.abonnement_actif
  );
  const grandesEntreprisesFT = offresFranceTravailAffichees.filter(
    (o) => o.source === "france_travail" && estGrandeEntreprise(o.tranche_effectif)
  );
  const caseA: OffreAffichee[] =
    entreprisesPayantes.length > 0 ? entreprisesPayantes : grandesEntreprisesFT;

  // Case B : petite structure, priorité absolue aux commerçants du coin
  const commercantsSimples = offresCommercantsAffichees.filter(
    (o) => o.source === "commercant" && o.categorie === "commercant"
  );
  const petitesEntreprisesFT = offresFranceTravailAffichees.filter(
    (o) => o.source === "france_travail" && !estGrandeEntreprise(o.tranche_effectif)
  );
  const caseB: OffreAffichee[] =
    commercantsSimples.length > 0 ? commercantsSimples : petitesEntreprisesFT;

  return (
    <BorneClient
      borne={{ id: borne.id, nom: borne.nom, lieu: borne.lieu }}
      villeId={borne.ville_id}
      villeNom={ville?.nom ?? ""}
      villeSlug={ville?.slug ?? ""}
      offres={offres}
      caseA={caseA}
      caseB={caseB}
      offresCommercantsCount={offresCommercants?.length ?? 0}
    />
  );
}
