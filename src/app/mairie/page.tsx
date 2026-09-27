import { createServerSupabaseClient } from "@/lib/supabase/server";
import MairieLogoutButton from "@/components/mairie/MairieLogoutButton";
import BoutonImprimer from "@/components/mairie/BoutonImprimer";

export const dynamic = "force-dynamic";

export default async function MairieDashboardPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: compte } = await supabase
    .from("comptes_mairie")
    .select("ville_id")
    .eq("user_id", user!.id)
    .single();

  if (!compte) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fond text-texte px-4">
        <p>Aucune ville n&apos;est associée à ce compte. Contactez l&apos;administrateur.</p>
      </div>
    );
  }

  const { data: ville } = await supabase
    .from("villes")
    .select("id, nom, slug")
    .eq("id", compte.ville_id)
    .single();

  const { data: bornes } = await supabase
    .from("bornes")
    .select("id, nom, lieu")
    .eq("ville_id", compte.ville_id);

  const { data: offresCommercantes } = await supabase
    .from("offres_commercants")
    .select("id, poste, nom_commerce")
    .eq("ville_id", compte.ville_id)
    .eq("statut", "publiee");

  const trenteJoursAvant = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const { data: evenements } = await supabase
    .from("evenements")
    .select("type, borne_id, offre_id, offre_type, created_at")
    .eq("ville_id", compte.ville_id)
    .gte("created_at", trenteJoursAvant.toISOString());

  const liste = evenements ?? [];
  const vues = liste.filter((e) => e.type === "vue" || e.type === "vue_site").length;
  const interet = liste.filter((e) => e.type === "interet").length;
  const qrAffiche = liste.filter((e) => e.type === "qr_affiche").length;
  const tauxInteret = vues > 0 ? ((interet / vues) * 100).toFixed(1) : "0";

  const courbe: { jour: string; total: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const jour = date.toISOString().slice(0, 10);
    const total = liste.filter((e) => e.created_at.slice(0, 10) === jour).length;
    courbe.push({ jour, total });
  }
  const maxCourbe = Math.max(1, ...courbe.map((c) => c.total));

  const bornesParId = new Map((bornes ?? []).map((b) => [b.id, b]));
  const parBorne = new Map<string, { nom: string; lieu: string; vue: number; interet: number }>();
  for (const e of liste) {
    if (!e.borne_id) continue;
    const borne = bornesParId.get(e.borne_id);
    if (!borne) continue;
    if (!parBorne.has(e.borne_id)) {
      parBorne.set(e.borne_id, { nom: borne.nom, lieu: borne.lieu, vue: 0, interet: 0 });
    }
    const ligne = parBorne.get(e.borne_id)!;
    if (e.type === "vue") ligne.vue += 1;
    if (e.type === "interet") ligne.interet += 1;
  }

  const offresParId = new Map((offresCommercantes ?? []).map((o) => [o.id, o]));
  const parOffre = new Map<string, { poste: string; nomCommerce: string; vue: number; interet: number }>();
  for (const e of liste) {
    if (e.offre_type !== "commercant") continue;
    const offre = offresParId.get(e.offre_id);
    if (!offre) continue;
    if (!parOffre.has(e.offre_id)) {
      parOffre.set(e.offre_id, { poste: offre.poste, nomCommerce: offre.nom_commerce, vue: 0, interet: 0 });
    }
    const ligne = parOffre.get(e.offre_id)!;
    if (e.type === "vue") ligne.vue += 1;
    if (e.type === "interet") ligne.interet += 1;
  }

  return (
    <div className="min-h-screen bg-fond text-texte px-6 py-10 print:bg-white">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-title text-3xl font-bold">Tableau de bord</h1>
            <p className="opacity-70">{ville?.nom} · 30 derniers jours</p>
          </div>
          <div className="flex items-center gap-4">
            <BoutonImprimer />
            <MairieLogoutButton />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCarte label="Vues d'offres" valeur={vues} />
          <StatCarte label="« Ça m'intéresse »" valeur={interet} />
          <StatCarte label="QR codes affichés" valeur={qrAffiche} />
          <StatCarte label="Taux d'intérêt" valeur={`${tauxInteret}%`} />
        </div>

        <p className="opacity-70">
          {(offresCommercantes ?? []).length} offre(s) de commerçants publiée(s)
        </p>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="font-bold mb-4">Activité des 30 derniers jours</p>
          <div className="flex items-end gap-[2px] h-32">
            {courbe.map((c) => (
              <div
                key={c.jour}
                title={`${c.jour} : ${c.total}`}
                className="flex-1 bg-vert rounded-t"
                style={{ height: `${(c.total / maxCourbe) * 100}%`, minHeight: c.total > 0 ? 2 : 0 }}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="font-bold mb-3">Résultats par borne</p>
          {parBorne.size === 0 ? (
            <p className="opacity-60 text-sm">Aucune donnée pour l&apos;instant.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Borne</th>
                  <th className="p-2">Vues</th>
                  <th className="p-2">Intérêt</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(parBorne.values()).map((b) => (
                  <tr key={b.nom} className="border-b last:border-0">
                    <td className="p-2">{b.nom} — {b.lieu}</td>
                    <td className="p-2">{b.vue}</td>
                    <td className="p-2">{b.interet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="font-bold mb-3">Résultats par offre de commerçant</p>
          {parOffre.size === 0 ? (
            <p className="opacity-60 text-sm">Aucune donnée pour l&apos;instant.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Offre</th>
                  <th className="p-2">Vues</th>
                  <th className="p-2">Intérêt</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(parOffre.values()).map((o) => (
                  <tr key={o.poste + o.nomCommerce} className="border-b last:border-0">
                    <td className="p-2">{o.poste} — {o.nomCommerce}</td>
                    <td className="p-2">{o.vue}</td>
                    <td className="p-2">{o.interet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCarte({ label, valeur }: { label: string; valeur: number | string }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 text-center">
      <p className="text-3xl font-bold text-vert">{valeur}</p>
      <p className="opacity-70 text-sm">{label}</p>
    </div>
  );
}
