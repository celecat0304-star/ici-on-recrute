import type { SupabaseClient } from "@supabase/supabase-js";

const TOKEN_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
const SEARCH_URL =
  "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";

type OffreApi = {
  id: string;
  intitule: string;
  description?: string;
  dateCreation?: string;
  entreprise?: { nom?: string };
  typeContrat?: string;
  typeContratLibelle?: string;
  dureeTravailLibelle?: string;
  dureeTravailLibelleConverti?: string;
  lieuTravail?: { libelle?: string };
  origineOffre?: { urlOrigine?: string };
  trancheEffectifEtab?: string;
};

// La tranche officielle la plus proche du seuil de 30 salariés est "20 à 49 salariés" :
// on considère tout ce qui est en dessous (ou inconnu) comme une petite structure.
const TRANCHES_GRANDES_ENTREPRISES = [
  "50 à 99 salariés",
  "100 à 199 salariés",
  "200 à 249 salariés",
  "250 à 499 salariés",
  "500 à 999 salariés",
  "1000 à 1999 salariés",
  "2000 à 4999 salariés",
  "5000 à 9999 salariés",
  "10000 salariés et plus",
];

export function estGrandeEntreprise(trancheEffectif: string | null): boolean {
  if (!trancheEffectif) return false;
  return TRANCHES_GRANDES_ENTREPRISES.includes(trancheEffectif);
}

async function getAccessToken(): Promise<string> {
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.FRANCE_TRAVAIL_CLIENT_ID!,
    client_secret: process.env.FRANCE_TRAVAIL_CLIENT_SECRET!,
    scope: "api_offresdemploiv2 o2dsoffre",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error(
      `Authentification France Travail échouée (${res.status}) : ${await res.text()}`
    );
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function fetchOffresPourVille(
  codeInsee: string,
  distanceKm: number
): Promise<OffreApi[]> {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    commune: codeInsee,
    distance: String(distanceKm),
    range: "0-149",
  });

  const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 204) return [];
  if (!res.ok && res.status !== 206) {
    throw new Error(
      `Recherche d'offres France Travail échouée (${res.status}) : ${await res.text()}`
    );
  }

  const data = (await res.json()) as { resultats?: OffreApi[] };
  return data.resultats ?? [];
}

export async function synchroniserOffresVille(
  supabase: SupabaseClient,
  ville: { id: string; code_insee: string | null; rayon_recherche_km: number | null }
): Promise<number> {
  if (!ville.code_insee) {
    throw new Error("Cette ville n'a pas de code INSEE renseigné.");
  }

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
    duree_travail: o.dureeTravailLibelleConverti ?? o.dureeTravailLibelle ?? null,
    lieu_travail: o.lieuTravail?.libelle ?? null,
    url_origine:
      o.origineOffre?.urlOrigine ??
      `https://candidat.francetravail.fr/offres/recherche/detail/${o.id}`,
    date_publication: o.dateCreation ?? null,
    date_maj: new Date().toISOString(),
    tranche_effectif: o.trancheEffectifEtab ?? null,
  }));

  if (lignes.length > 0) {
    const { error } = await supabase
      .from("offres_france_travail")
      .upsert(lignes, { onConflict: "id_france_travail" });
    if (error) throw new Error(error.message);
  }

  return lignes.length;
}
