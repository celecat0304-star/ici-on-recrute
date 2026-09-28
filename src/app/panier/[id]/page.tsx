import { notFound } from "next/navigation";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { IconeDocument, IconeChevron } from "@/components/icones/Icones";
import CandidatureCommune from "@/components/ville/CandidatureCommune";
import { Logo } from "@/components/borne/BorneComposants";

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
            .select("id, nom_commerce, poste, type_contrat, comment_postuler, accepte_candidatures")
            .in("id", idsCommercant)
        : Promise.resolve({ data: [] as { id: string; nom_commerce: string; poste: string; type_contrat: string; comment_postuler: string; accepte_candidatures: boolean }[] }),
      idsFranceTravail.length > 0
        ? supabase
            .from("offres_france_travail")
            .select("id, intitule, entreprise_nom, type_contrat, url_origine")
            .in("id", idsFranceTravail)
        : Promise.resolve({ data: [] as { id: string; intitule: string; entreprise_nom: string | null; type_contrat: string | null; url_origine: string }[] }),
    ]);

  const total = (offresCommercants ?? []).length + (offresFranceTravail ?? []).length;
  const offresCandidatureCommune = (offresCommercants ?? []).filter((o) => o.accepte_candidatures);

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#0F1A45] flex flex-col">
      <header className="px-6 py-5">
        <Logo taille={22} />
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 pb-16 flex flex-col gap-6">
        <div>
          <h1 className="font-title text-3xl font-bold">Vos offres sélectionnées</h1>
          {ville && <p className="opacity-70 mt-1">à {ville.nom} · {total} offre{total > 1 ? "s" : ""}</p>}
        </div>

        {offresCandidatureCommune.length > 0 && (
          <CandidatureCommune
            panierId={id}
            offres={offresCandidatureCommune.map((o) => ({
              id: o.id,
              poste: o.poste,
              nom_commerce: o.nom_commerce,
            }))}
          />
        )}

        <div className="flex flex-col gap-4">
          {(offresCommercants ?? []).map((o) => (
            <div key={o.id} className="bg-white border border-black/5 shadow-sm rounded-2xl p-5 flex flex-col gap-2">
              {o.type_contrat && (
                <span className="self-start flex items-center gap-1 bg-jaune text-texte font-bold px-3 py-1 rounded-full text-sm">
                  <IconeDocument className="w-3.5 h-3.5" />
                  {o.type_contrat}
                </span>
              )}
              <h2 className="text-xl font-bold">{o.poste}</h2>
              <p className="opacity-80">{o.nom_commerce}</p>
              <p className="mt-1">
                <strong>Comment postuler :</strong> {o.comment_postuler}
              </p>
              {ville && (
                <Link
                  href={`/ville/${ville.slug}/offres/${o.id}`}
                  className="inline-flex items-center gap-1 text-sm font-bold text-vert hover:underline"
                >
                  Voir la fiche complète <IconeChevron className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          ))}

          {(offresFranceTravail ?? []).map((o) => (
            <div key={o.id} className="bg-white border border-black/5 shadow-sm rounded-2xl p-5 flex flex-col gap-2">
              {o.type_contrat && (
                <span className="self-start flex items-center gap-1 bg-jaune text-texte font-bold px-3 py-1 rounded-full text-sm">
                  <IconeDocument className="w-3.5 h-3.5" />
                  {o.type_contrat}
                </span>
              )}
              <h2 className="text-xl font-bold">{o.intitule}</h2>
              {o.entreprise_nom && <p className="opacity-80">{o.entreprise_nom}</p>}
              <a
                href={o.url_origine}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start mt-2 inline-flex items-center gap-2 bg-vert text-white font-bold rounded-xl px-5 py-3 shadow-md shadow-vert/20 hover:-translate-y-0.5"
              >
                Postuler sur France Travail <IconeChevron className="w-4 h-4" />
              </a>
            </div>
          ))}

          {(offresCommercants ?? []).length === 0 &&
            (offresFranceTravail ?? []).length === 0 && (
              <p className="opacity-60">Ce panier ne contient plus d&apos;offres disponibles.</p>
            )}
        </div>
      </main>
    </div>
  );
}
