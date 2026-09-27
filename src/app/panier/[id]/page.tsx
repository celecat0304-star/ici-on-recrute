import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export default async function PanierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createPublicClient();

  const { data: panier } = await supabase
    .from("paniers")
    .select("id, ville_id, villes ( nom, slug )")
    .eq("id", id)
    .maybeSingle();

  if (!panier) notFound();

  const villeRelation = panier.villes as unknown as
    | { nom: string; slug: string }
    | { nom: string; slug: string }[]
    | null;
  const ville = Array.isArray(villeRelation) ? villeRelation[0] : villeRelation;

  const { data: lignes } = await supabase
    .from("panier_offres")
    .select("offre_type, offre_id")
    .eq("panier_id", id);

  const idsCommercant = (lignes ?? [])
    .filter((l) => l.offre_type === "commercant")
    .map((l) => l.offre_id);
  const idsFranceTravail = (lignes ?? [])
    .filter((l) => l.offre_type === "france_travail")
    .map((l) => l.offre_id);

  const [{ data: offresCommercants }, { data: offresFranceTravail }] =
    await Promise.all([
      idsCommercant.length > 0
        ? supabase
            .from("offres_commercants")
            .select("id, nom_commerce, poste, type_contrat, comment_postuler")
            .in("id", idsCommercant)
        : Promise.resolve({ data: [] as { id: string; nom_commerce: string; poste: string; type_contrat: string; comment_postuler: string }[] }),
      idsFranceTravail.length > 0
        ? supabase
            .from("offres_france_travail")
            .select("id, intitule, entreprise_nom, type_contrat, url_origine")
            .in("id", idsFranceTravail)
        : Promise.resolve({ data: [] as { id: string; intitule: string; entreprise_nom: string | null; type_contrat: string | null; url_origine: string }[] }),
    ]);

  return (
    <div className="min-h-screen bg-fond-sombre text-texte-sombre px-6 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-title text-3xl font-bold">Vos offres sélectionnées</h1>
          {ville && <p className="opacity-70">à {ville.nom}</p>}
        </div>

        <div className="flex flex-col gap-4">
          {(offresCommercants ?? []).map((o) => (
            <div key={o.id} className="bg-surface-sombre rounded-xl p-5">
              {o.type_contrat && (
                <span className="bg-jaune text-texte font-bold px-3 py-1 rounded-full text-sm">
                  {o.type_contrat}
                </span>
              )}
              <h2 className="text-xl font-bold mt-2">{o.poste}</h2>
              <p className="opacity-80">{o.nom_commerce}</p>
              <p className="mt-2">
                <strong>Comment postuler :</strong> {o.comment_postuler}
              </p>
              {ville && (
                <a
                  href={`/ville/${ville.slug}/offres/${o.id}`}
                  className="underline text-sm opacity-70"
                >
                  Voir la fiche complète
                </a>
              )}
            </div>
          ))}

          {(offresFranceTravail ?? []).map((o) => (
            <div key={o.id} className="bg-surface-sombre rounded-xl p-5">
              {o.type_contrat && (
                <span className="bg-jaune text-texte font-bold px-3 py-1 rounded-full text-sm">
                  {o.type_contrat}
                </span>
              )}
              <h2 className="text-xl font-bold mt-2">{o.intitule}</h2>
              {o.entreprise_nom && <p className="opacity-80">{o.entreprise_nom}</p>}
              <a
                href={o.url_origine}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block bg-vert text-white font-bold rounded-lg px-5 py-3"
              >
                Postuler sur France Travail
              </a>
            </div>
          ))}

          {(offresCommercants ?? []).length === 0 &&
            (offresFranceTravail ?? []).length === 0 && (
              <p className="opacity-60">Ce panier ne contient plus d&apos;offres disponibles.</p>
            )}
        </div>
      </div>
    </div>
  );
}
