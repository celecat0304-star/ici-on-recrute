import { createPublicClient } from "@/lib/supabase/public";
import CommercantForm from "@/components/commercant/CommercantForm";

export const dynamic = "force-dynamic";

export default async function EntreprisePage() {
  const supabase = createPublicClient();
  const { data: villes } = await supabase
    .from("villes")
    .select("id, nom")
    .order("nom", { ascending: true });

  return (
    <div className="min-h-screen bg-fond text-texte px-4 py-10">
      <div className="max-w-xl mx-auto">
        <h1 className="font-title text-3xl font-bold mb-2">
          Mettez votre offre en avant
        </h1>
        <p className="mb-8 opacity-80">
          Pour les entreprises de 30 salariés ou plus. Votre offre sera
          vérifiée puis mise en avant sur les bornes de la ville, en alternance
          avec les autres offres. Nous vous recontacterons pour la mise en
          avant payante.
        </p>
        <CommercantForm villes={villes ?? []} categorie="entreprise" />
      </div>
    </div>
  );
}
