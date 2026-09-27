import { createAdminClient } from "@/lib/supabase/admin";
import AdminNav from "@/components/admin/AdminNav";
import OffresPublieesListe, {
  type OffrePublieeAdmin,
} from "@/components/admin/OffresPublieesListe";

export const dynamic = "force-dynamic";

export default async function AdminPublieesPage() {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("offres_commercants")
    .select(
      "id, nom_commerce, poste, date_expiration, created_at, villes ( nom )"
    )
    .eq("statut", "publiee")
    .order("date_expiration", { ascending: true });

  const offres: OffrePublieeAdmin[] = (data ?? []).map((o) => {
    const villeRelation = o.villes as unknown as
      | { nom: string }
      | { nom: string }[]
      | null;
    const ville = Array.isArray(villeRelation) ? villeRelation[0] : villeRelation;
    return {
      id: o.id,
      nom_commerce: o.nom_commerce,
      poste: o.poste,
      date_expiration: o.date_expiration,
      ville_nom: ville?.nom ?? "",
    };
  });

  return (
    <div className="min-h-screen bg-fond text-texte px-6 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-title text-3xl font-bold">
            Offres publiées ({offres.length})
          </h1>
          <AdminNav />
        </div>
        <OffresPublieesListe offres={offres} />
      </div>
    </div>
  );
}
