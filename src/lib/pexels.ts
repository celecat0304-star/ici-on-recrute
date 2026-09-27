import { createAdminClient } from "@/lib/supabase/admin";

// Traduction très simple de mots-clés de métiers français -> anglais pour Pexels.
const DICTIONNAIRE: Record<string, string> = {
  boulanger: "baker bakery",
  boulangere: "baker bakery",
  boulangerie: "bakery",
  vendeur: "shop seller retail",
  vendeuse: "shop seller retail",
  serveur: "waiter restaurant",
  serveuse: "waitress restaurant",
  cuisinier: "chef cooking kitchen",
  cuisiniere: "chef cooking kitchen",
  coiffeur: "hairdresser salon",
  coiffeuse: "hairdresser salon",
  fleuriste: "florist flower shop",
  boucher: "butcher shop",
  bouchere: "butcher shop",
  patissier: "pastry chef bakery",
  patissiere: "pastry chef bakery",
  mecanicien: "mechanic garage",
  mecanicienne: "mechanic garage",
  caissier: "cashier shop",
  caissiere: "cashier shop",
  menage: "cleaning staff",
  proprete: "cleaning staff",
  livreur: "delivery courier",
  livreuse: "delivery courier",
  jardinier: "gardener",
  jardiniere: "gardener",
  employe: "employee shop",
  employee: "employee shop",
  magasin: "retail shop store",
  commerce: "retail shop store",
  restaurant: "restaurant",
  cafe: "cafe coffee shop",
  hotel: "hotel hospitality",
  agent: "worker staff",
};

function enleverAccents(texte: string): string {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function traduireEnMotsCles(poste: string): string {
  const mots = enleverAccents(poste.toLowerCase()).split(/[^a-z]+/).filter(Boolean);
  const traductions = mots
    .map((mot) => DICTIONNAIRE[mot])
    .filter((valeur): valeur is string => Boolean(valeur));

  if (traductions.length > 0) {
    return Array.from(new Set(traductions.join(" ").split(" "))).join(" ");
  }
  // Repli : on tente la recherche avec le poste tel quel
  return poste;
}

export type PhotoPexels = {
  url: string;
  photographe: string;
  lienPhotographe: string;
  lienPexels: string;
};

export async function rechercherPhotosPexels(
  poste: string
): Promise<PhotoPexels[]> {
  const motsCles = traduireEnMotsCles(poste);
  const supabase = createAdminClient();

  const uneJourneeAvant = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: cache } = await supabase
    .from("pexels_cache")
    .select("resultats, cree_le")
    .eq("mot_cle", motsCles)
    .maybeSingle();

  if (cache && cache.cree_le > uneJourneeAvant) {
    return cache.resultats as PhotoPexels[];
  }

  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(
      motsCles
    )}&per_page=6&orientation=landscape`,
    { headers: { Authorization: process.env.PEXELS_API_KEY! } }
  );

  if (!res.ok) {
    throw new Error(`Échec de la recherche Pexels (${res.status})`);
  }

  const data = await res.json();
  const photos: PhotoPexels[] = (data.photos ?? []).map(
    (p: {
      src: { large: string };
      photographer: string;
      photographer_url: string;
      url: string;
    }) => ({
      url: p.src.large,
      photographe: p.photographer,
      lienPhotographe: p.photographer_url,
      lienPexels: p.url,
    })
  );

  await supabase
    .from("pexels_cache")
    .upsert(
      { mot_cle: motsCles, resultats: photos, cree_le: new Date().toISOString() },
      { onConflict: "mot_cle" }
    );

  return photos;
}
