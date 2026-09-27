import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import VillesManager, {
  type VilleAvecDetails,
} from "@/components/admin/VillesManager";

export const dynamic = "force-dynamic";

export default async function AdminVillesPage() {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("villes")
    .select(
      "id, nom, slug, code_postal, code_insee, rayon_recherche_km, bornes ( id, nom, lieu ), comptes_mairie ( id )"
    )
    .order("nom", { ascending: true });

  const villes: VilleAvecDetails[] = (data ?? []).map((v) => ({
    id: v.id,
    nom: v.nom,
    slug: v.slug,
    code_postal: v.code_postal,
    code_insee: v.code_insee,
    rayon_recherche_km: v.rayon_recherche_km,
    bornes: v.bornes ?? [],
    aUnCompteMairie: (v.comptes_mairie ?? []).length > 0,
  }));

  return (
    <div className="min-h-screen bg-fond text-texte px-6 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-title text-3xl font-bold">Villes et bornes</h1>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="underline">
              À valider
            </Link>
            <Link href="/admin/statistiques" className="underline">
              Statistiques
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
        <VillesManager villes={villes} />
      </div>
    </div>
  );
}
