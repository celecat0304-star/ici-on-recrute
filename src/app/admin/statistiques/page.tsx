import { createAdminClient } from "@/lib/supabase/admin";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function StatistiquesPage() {
  const supabase = createAdminClient();

  const { data: evenements } = await supabase
    .from("evenements")
    .select("type, ville_id, villes ( nom )")
    .order("created_at", { ascending: false })
    .limit(2000);

  const totaux = { vue: 0, interet: 0, qr_affiche: 0, vue_site: 0, candidature: 0 };
  const parVille = new Map<string, { nom: string } & typeof totaux>();

  for (const e of evenements ?? []) {
    if (e.type in totaux) totaux[e.type as keyof typeof totaux] += 1;

    const villeRelation = e.villes as unknown as { nom: string } | { nom: string }[] | null;
    const villeNom = (Array.isArray(villeRelation) ? villeRelation[0] : villeRelation)?.nom ?? "?";

    if (!parVille.has(e.ville_id)) {
      parVille.set(e.ville_id, {
        nom: villeNom,
        vue: 0,
        interet: 0,
        qr_affiche: 0,
        vue_site: 0,
        candidature: 0,
      });
    }
    const ligne = parVille.get(e.ville_id)!;
    if (e.type in totaux) ligne[e.type as keyof typeof totaux] += 1;
  }

  return (
    <div className="min-h-screen bg-fond text-texte px-6 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-title text-3xl font-bold">Statistiques</h1>
          <AdminNav />
        </div>

        <p className="text-sm opacity-60 -mt-4">2000 derniers événements, toutes villes</p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCarte label="Vues d'offre" valeur={totaux.vue} />
          <StatCarte label="« Ça m'intéresse »" valeur={totaux.interet} />
          <StatCarte label="QR codes affichés" valeur={totaux.qr_affiche} />
          <StatCarte label="Vues sur le site" valeur={totaux.vue_site} />
          <StatCarte label="Candidatures" valeur={totaux.candidature} />
        </div>

        <div className="bg-white rounded-2xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-3">Ville</th>
                <th className="p-3">Vues</th>
                <th className="p-3">Intérêt</th>
                <th className="p-3">QR</th>
                <th className="p-3">Vues site</th>
                <th className="p-3">Candidatures</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(parVille.values()).map((ligne) => (
                <tr key={ligne.nom} className="border-b last:border-0">
                  <td className="p-3 font-bold">{ligne.nom}</td>
                  <td className="p-3">{ligne.vue}</td>
                  <td className="p-3">{ligne.interet}</td>
                  <td className="p-3">{ligne.qr_affiche}</td>
                  <td className="p-3">{ligne.vue_site}</td>
                  <td className="p-3">{ligne.candidature}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCarte({ label, valeur }: { label: string; valeur: number }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 text-center">
      <p className="text-3xl font-bold text-vert">{valeur}</p>
      <p className="opacity-70 text-sm">{label}</p>
    </div>
  );
}
