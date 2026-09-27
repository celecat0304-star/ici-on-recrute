import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import BorneClient from "@/components/borne/BorneClient";

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

  const { data: offres } = await supabase
    .from("offres_france_travail")
    .select(
      "id, id_france_travail, ville_id, intitule, description, entreprise_nom, type_contrat, duree_travail, lieu_travail, url_origine, date_publication, date_maj"
    )
    .eq("ville_id", borne.ville_id)
    .order("date_publication", { ascending: false });

  return (
    <BorneClient
      borne={{ id: borne.id, nom: borne.nom, lieu: borne.lieu }}
      villeNom={ville?.nom ?? ""}
      villeSlug={ville?.slug ?? ""}
      offres={offres ?? []}
    />
  );
}
