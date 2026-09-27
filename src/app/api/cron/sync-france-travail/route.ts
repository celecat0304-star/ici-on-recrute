import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchOffresPourVille } from "@/lib/franceTravail";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const authHeader = request.headers.get("authorization");

  if (isProd && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: villes, error: villesError } = await supabase
    .from("villes")
    .select("id, nom, code_insee, rayon_recherche_km");

  if (villesError) {
    return NextResponse.json({ error: villesError.message }, { status: 500 });
  }

  const resultats: Record<string, number | string> = {};
  let total = 0;

  for (const ville of villes ?? []) {
    if (!ville.code_insee) {
      resultats[ville.nom] = "ignorée (pas de code INSEE)";
      continue;
    }

    try {
      const offres = await fetchOffresPourVille(
        ville.code_insee,
        ville.rayon_recherche_km ?? 10
      );

      const lignes = offres.map((o) => ({
        id_france_travail: o.id,
        ville_id: ville.id,
        intitule: o.intitule,
        description: o.description ?? null,
        entreprise_nom: o.entreprise?.nom ?? null,
        type_contrat: o.typeContratLibelle ?? o.typeContrat ?? null,
        duree_travail:
          o.dureeTravailLibelleConverti ?? o.dureeTravailLibelle ?? null,
        lieu_travail: o.lieuTravail?.libelle ?? null,
        url_origine:
          o.origineOffre?.urlOrigine ??
          `https://candidat.francetravail.fr/offres/recherche/detail/${o.id}`,
        date_publication: o.dateCreation ?? null,
        date_maj: new Date().toISOString(),
      }));

      if (lignes.length > 0) {
        const { error } = await supabase
          .from("offres_france_travail")
          .upsert(lignes, { onConflict: "id_france_travail" });

        if (error) {
          resultats[ville.nom] = `erreur : ${error.message}`;
          continue;
        }
      }

      resultats[ville.nom] = lignes.length;
      total += lignes.length;
    } catch (err) {
      resultats[ville.nom] = `erreur : ${(err as Error).message}`;
    }
  }

  return NextResponse.json({ ok: true, total, villes: resultats });
}
