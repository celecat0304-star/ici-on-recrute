import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function StatistiquesPage() {
  const supabase = createAdminClient();

  const { data: evenements } = await supabase
    .from("evenements")
    .select("type, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const totaux = { vue: 0, interet: 0, qr_affiche: 0, vue_site: 0 };
  for (const e of evenements ?? []) {
    if (e.type in totaux) totaux[e.type as keyof typeof totaux] += 1;
  }

  return (
    <div className="min-h-screen bg-fond text-texte px-6 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <h1 className="font-title text-3xl font-bold">
          Statistiques (500 derniers événements)
        </h1>
        <div className="grid grid-cols-2 gap-4">
          <StatCarte label="Vues d'offre" valeur={totaux.vue} />
          <StatCarte label="« Ça m'intéresse »" valeur={totaux.interet} />
          <StatCarte label="QR codes affichés" valeur={totaux.qr_affiche} />
          <StatCarte label="Vues sur le site" valeur={totaux.vue_site} />
        </div>
        <p className="text-sm opacity-60">
          Un tableau détaillé par ville et par borne arrivera à l&apos;étape 8
          (tableau de bord mairie).
        </p>
      </div>
    </div>
  );
}

function StatCarte({ label, valeur }: { label: string; valeur: number }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 text-center">
      <p className="text-4xl font-bold text-vert">{valeur}</p>
      <p className="opacity-70">{label}</p>
    </div>
  );
}
