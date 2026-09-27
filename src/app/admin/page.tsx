import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminOffresList, {
  type OffreCommercantAdmin,
} from "@/components/admin/AdminOffresList";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("offres_commercants")
    .select(
      "id, nom_commerce, poste, type_contrat, temps_travail, horaires, quartier, description, comment_postuler, siret, created_at, image_url, image_source, pexels_photographe, villes ( nom )"
    )
    .eq("statut", "en_attente")
    .order("created_at", { ascending: true });

  const offres: OffreCommercantAdmin[] = (data ?? []).map((o) => {
    const villeRelation = o.villes as unknown as
      | { nom: string }
      | { nom: string }[]
      | null;
    const ville = Array.isArray(villeRelation) ? villeRelation[0] : villeRelation;
    return {
      id: o.id,
      nom_commerce: o.nom_commerce,
      poste: o.poste,
      type_contrat: o.type_contrat,
      temps_travail: o.temps_travail,
      horaires: o.horaires,
      quartier: o.quartier,
      description: o.description,
      comment_postuler: o.comment_postuler,
      siret: o.siret,
      created_at: o.created_at,
      image_url: o.image_url,
      image_source: o.image_source,
      pexels_photographe: o.pexels_photographe,
      ville_nom: ville?.nom ?? "",
    };
  });

  return (
    <div className="min-h-screen bg-fond text-texte px-6 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-title text-3xl font-bold">
            À valider ({offres.length})
          </h1>
          <div className="flex items-center gap-4">
            <Link href="/admin/statistiques" className="underline">
              Statistiques
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
        <AdminOffresList offres={offres} />
      </div>
    </div>
  );
}
