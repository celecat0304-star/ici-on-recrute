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
};

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
