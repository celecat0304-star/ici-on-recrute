import { createPublicClient } from "@/lib/supabase/public";
import CommercantForm from "@/components/commercant/CommercantForm";

export const dynamic = "force-dynamic";

export default async function CommercantPage() {
  const supabase = createPublicClient();
  const { data: villes } = await supabase
    .from("villes")
    .select("id, nom")
    .order("nom", { ascending: true });

  return (
    <div className="min-h-screen bg-fond text-texte px-4 py-10">
      <div className="max-w-xl mx-auto">
        <h1 className="font-title text-3xl font-bold mb-2">
          Vous recrutez ?
        </h1>
        <p className="mb-8 opacity-80">
          Déposez une offre gratuitement. Elle sera vérifiée avant d&apos;être
          publiée sur les bornes et le site emploi de votre ville.
        </p>
        <CommercantForm villes={villes ?? []} />
      </div>
    </div>
  );
}
