const HEURES_PAR_MOIS = 151.67;

// Transforme le libellé de salaire d'une offre (« Mensuel de 1801,80 Euros à 2000 Euros sur 12 mois »,
// « Horaire de 12 Euros », « Annuel de 26000 Euros… ») en salaire brut mensuel min / max.
export function salaireMensuel(libelle: string | null | undefined): { min: number; max: number } | null {
  if (!libelle) return null;
  const texte = libelle
    .toLowerCase()
    .replace(/sur\s*\d+([.,]\d+)?\s*mois/g, " ");

  // Seuls les nombres suivis de « euros » comptent : les commentaires libres
  // (« convention du 15 mars 1966 », « 5 tenues par saison ») sont ignorés.
  const nombres = [
    ...texte.matchAll(
      /(\d{1,3}(?:[\s ]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)\s*(?:euros?|€)/g
    ),
  ].map((m) => parseFloat(m[1].replace(/[\s ]/g, "").replace(",", ".")));
  if (nombres.length === 0) return null;

  const a = nombres[0];
  const b = nombres.length > 1 ? nombres[1] : nombres[0];

  let facteur: number;
  if (/horaire|de l'heure|\/\s*h\b|par heure/.test(texte)) facteur = HEURES_PAR_MOIS;
  else if (/annuel|par an|\/\s*an\b/.test(texte)) facteur = 1 / 12;
  else if (/mensuel|par mois|\/\s*mois/.test(texte)) facteur = 1;
  else if (a < 100) facteur = HEURES_PAR_MOIS;
  else if (a >= 12000) facteur = 1 / 12;
  else facteur = 1;

  const min = Math.round(Math.min(a, b) * facteur);
  const max = Math.round(Math.max(a, b) * facteur);
  if (min < 500 || max > 30000) return null;
  return { min, max };
}
