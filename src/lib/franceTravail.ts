import type { SupabaseClient } from "@supabase/supabase-js";
import { salaireMensuel } from "@/lib/salaire";

const TOKEN_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
const SEARCH_URL =
  "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";

type OffreApi = {
  id: string;
  intitule: string;
  description?: string;
  dateCreation?: string;
  entreprise?: { nom?: string; logo?: string };
  typeContrat?: string;
  typeContratLibelle?: string;
  dureeTravailLibelle?: string;
  dureeTravailLibelleConverti?: string;
  lieuTravail?: { libelle?: string; latitude?: number; longitude?: number };
  origineOffre?: { urlOrigine?: string };
  trancheEffectifEtab?: string;
  salaire?: { libelle?: string };
};

// « 51 - REIMS » -> { departement: "51", nom: "REIMS" }
function analyserLieu(libelle: string | undefined) {
  const m = libelle?.match(/^\s*(\d{2,3})\s*-\s*(.+?)\s*$/);
  return m ? { departement: m[1], nom: m[2] } : null;
}

function cleCommune(libelle: string | undefined) {
  const l = analyserLieu(libelle);
  return l ? `${l.departement}|${l.nom.toLowerCase()}` : "";
}

// Centre des communes citées dans les offres : [latitude, longitude], via l'API officielle des communes.
async function centresDesCommunes(libelles: (string | undefined)[]) {
  const uniques = new Map<string, { departement: string; nom: string }>();
  for (const l of libelles) {
    const lieu = analyserLieu(l);
    if (lieu) uniques.set(cleCommune(l), lieu);
  }
  const resultat = new Map<string, [number, number]>();
  const aFaire = [...uniques.entries()];
  const travailler = async () => {
    for (let item = aFaire.pop(); item; item = aFaire.pop()) {
      const [cle, lieu] = item;
      try {
        const res = await fetch(
          `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(lieu.nom)}&codeDepartement=${lieu.departement}&fields=centre&boost=population&limit=1`
        );
        if (!res.ok) continue;
        const communes = (await res.json()) as { centre?: { coordinates?: [number, number] } }[];
        const coord = communes[0]?.centre?.coordinates;
        if (coord) resultat.set(cle, [coord[1], coord[0]]);
      } catch {
        // commune introuvable : l'offre restera sans position
      }
    }
  };
  await Promise.all([travailler(), travailler(), travailler(), travailler()]);
  return resultat;
}

// Centre de la commune (sert au calcul de distance des offres de commerçants)
async function completerCentreVille(supabase: SupabaseClient, villeId: string, codeInsee: string) {
  const { data } = await supabase.from("villes").select("latitude").eq("id", villeId).single();
  if (data?.latitude != null) return;
  const res = await fetch(`https://geo.api.gouv.fr/communes/${codeInsee}?fields=centre`);
  if (!res.ok) return;
  const commune = (await res.json()) as { centre?: { coordinates?: [number, number] } };
  const coord = commune.centre?.coordinates;
  if (!coord) return;
  await supabase.from("villes").update({ longitude: coord[0], latitude: coord[1] }).eq("id", villeId);
}

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

  // L'API renvoie 150 offres au maximum par requête et n'accepte pas de dépasser
  // la position 3149 : on lit donc les résultats page par page.
  const TAILLE_PAGE = 150;
  const POSITION_MAX = 3149;
  const offres = new Map<string, OffreApi>();

  for (let debut = 0; debut <= POSITION_MAX; debut += TAILLE_PAGE) {
    const fin = Math.min(debut + TAILLE_PAGE - 1, POSITION_MAX);
    const params = new URLSearchParams({
      commune: codeInsee,
      distance: String(distanceKm),
      range: `${debut}-${fin}`,
    });

    const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 204) break;
    if (!res.ok && res.status !== 206) {
      throw new Error(
        `Recherche d'offres France Travail échouée (${res.status}) : ${await res.text()}`
      );
    }

    const data = (await res.json()) as { resultats?: OffreApi[] };
    const page = data.resultats ?? [];
    for (const o of page) offres.set(o.id, o);

    if (page.length < TAILLE_PAGE) break;
    // l'API limite le nombre de requêtes par seconde
    await new Promise((r) => setTimeout(r, 200));
  }

  return [...offres.values()];
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

  await completerCentreVille(supabase, ville.id, ville.code_insee);

  // Beaucoup d'offres n'ont pas de position précise : on prend le centre de leur commune.
  const communes = await centresDesCommunes(
    offres.filter((o) => o.lieuTravail?.latitude == null).map((o) => o.lieuTravail?.libelle)
  );

  const lignes = offres.map((o) => {
    const salaire = salaireMensuel(o.salaire?.libelle);
    return {
    latitude: o.lieuTravail?.latitude ?? communes.get(cleCommune(o.lieuTravail?.libelle))?.[0] ?? null,
    longitude: o.lieuTravail?.longitude ?? communes.get(cleCommune(o.lieuTravail?.libelle))?.[1] ?? null,
    salaire_libelle: o.salaire?.libelle ?? null,
    salaire_mensuel_min: salaire?.min ?? null,
    salaire_mensuel_max: salaire?.max ?? null,
    id_france_travail: o.id,
    ville_id: ville.id,
    intitule: o.intitule,
    description: o.description ?? null,
    entreprise_nom: o.entreprise?.nom ?? null,
    entreprise_logo_url: o.entreprise?.logo ?? null,
    type_contrat: o.typeContratLibelle ?? o.typeContrat ?? null,
    duree_travail: o.dureeTravailLibelleConverti ?? o.dureeTravailLibelle ?? null,
    lieu_travail: o.lieuTravail?.libelle ?? null,
    url_origine:
      o.origineOffre?.urlOrigine ??
      `https://candidat.francetravail.fr/offres/recherche/detail/${o.id}`,
    date_publication: o.dateCreation ?? null,
    date_maj: new Date().toISOString(),
    tranche_effectif: o.trancheEffectifEtab ?? null,
    };
  });

  if (lignes.length > 0) {
    const { error } = await supabase
      .from("offres_france_travail")
      .upsert(lignes, { onConflict: "id_france_travail" });
    if (error) throw new Error(error.message);
  }

  return lignes.length;
}
