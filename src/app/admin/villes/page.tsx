import { createAdminClient } from "@/lib/supabase/admin";
import AdminNav from "@/components/admin/AdminNav";
import VillesManager, {
  type VilleAvecDetails,
} from "@/components/admin/VillesManager";

export const dynamic = "force-dynamic";

export default async function AdminVillesPage() {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("villes")
    .select(
      "id, nom, slug, code_postal, code_insee, rayon_recherche_km, photo_hero_url, bornes ( id, nom, lieu ), comptes_mairie ( id )"
    )
    .order("nom", { ascending: true });

  const villes: VilleAvecDetails[] = (data ?? []).map((v) => ({
    id: v.id,
    nom: v.nom,
    slug: v.slug,
    code_postal: v.code_postal,
    code_insee: v.code_insee,
    rayon_recherche_km: v.rayon_recherche_km,
    photo_hero_url: v.photo_hero_url,
    bornes: v.bornes ?? [],
    aUnCompteMairie: (v.comptes_mairie ?? []).length > 0,
  }));

  return (
    <div className="min-h-screen bg-fond text-texte px-6 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-title text-3xl font-bold">Villes et bornes</h1>
          <AdminNav />
        </div>
        <VillesManager villes={villes} />
      </div>
    </div>
  );
}
