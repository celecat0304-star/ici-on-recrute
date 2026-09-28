import type { OffreAffichee } from "@/lib/types";

import { themeDeOffre } from "@/lib/imagesThemes";

export type Filtres = {
  texte: string;
  secteur: string | null;
  contrats: string[];
  commercantsSeul: boolean;
  distanceKm: number | null;
  salaireMin: number | null;
};

export const FILTRES_VIDES: Filtres = {
  texte: "",
  secteur: null,
  contrats: [],
  commercantsSeul: false,
  distanceKm: null,
  salaireMin: null,
};

export type Domicile = { nom: string; latitude: number; longitude: number };
export type Contexte = { domicile: Domicile | null; centreVille: { latitude: number; longitude: number } | null };

export const DISTANCES_KM = [5, 10, 20, 50];
export const SALAIRES_MIN = [1500, 1800, 2000, 2500];

// Distance à vol d'oiseau en km (formule de haversine)
export function distanceEntre(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function formaterEuros(n: number) {
  return `${n.toLocaleString("fr-FR").replace(/ | /g, " ")} €`;
}

// Estimation à partir du salaire publié dans l'offre (converti en brut mensuel) : toujours présentée comme approximative.
export function salaireAffiche(min: number | null, max: number | null) {
  if (min == null) return null;
  if (max == null || max <= min) return `≈ ${formaterEuros(min)} brut / mois`;
  return `≈ ${formaterEuros(min)} à ${formaterEuros(max)} brut / mois`;
}

export const CONTRATS = ["CDI", "CDD", "Intérim", "Alternance", "Saisonnier"];

const MOTS_CONTRAT: Record<string, string[]> = {
  CDI: ["cdi"],
  CDD: ["cdd"],
  Intérim: ["intérim", "interim", "mission"],
  Alternance: ["altern", "apprenti", "professionnalisation"],
  Saisonnier: ["saison"],
};

// Les domaines sont déduits du titre de l'offre (les mêmes que pour les photos d'illustration).
export const SECTEURS: { id: string; libelle: string }[] = [
  { id: "commerce", libelle: "Commerce" },
  { id: "restauration", libelle: "Restauration" },
  { id: "sante", libelle: "Santé" },
  { id: "logistique", libelle: "Logistique" },
  { id: "industrie", libelle: "Industrie" },
  { id: "batiment", libelle: "Bâtiment" },
  { id: "administration", libelle: "Administration" },
  { id: "enfance", libelle: "Enfance et éducation" },
  { id: "beaute", libelle: "Beauté" },
  { id: "proprete", libelle: "Propreté" },
  { id: "hotellerie", libelle: "Hôtellerie" },
  { id: "securite", libelle: "Sécurité" },
  { id: "informatique", libelle: "Informatique" },
  { id: "espacesverts", libelle: "Espaces verts" },
];

const PALETTE_AVATAR = ["#0F1A45", "#8A4200", "#1A249E", "#0E8A4A", "#3B4152", "#7A2E6E"];

export function couleurAvatar(texte: string) {
  const somme = texte.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PALETTE_AVATAR[somme % PALETTE_AVATAR.length];
}

export function couleurContrat(contrat: string | null) {
  if (!contrat) return "#9A968A";
  const c = contrat.toLowerCase();
  if (c.includes("cdi")) return "#0E8A4A";
  if (c.includes("intérim") || c.includes("interim")) return "#E8860C";
  if (c.includes("cdd")) return "#2B3BE0";
  if (c.includes("altern") || c.includes("apprenti")) return "#7A4FD6";
  return "#9A968A";
}

export function initiales(texte: string) {
  const mots = texte.replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
}

export function capitaliser(nom: string) {
  return nom
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toUpperCase());
}

// « 51 - REIMS » devient « Reims » ; le département n'est gardé que hors du département de la ville.
export function nettoyerLieu(lieu: string | null, departementVille?: string) {
  if (!lieu) return null;
  const m = lieu.match(/^\s*(\d{2,3})\s*-\s*(.+)$/);
  const dept = m ? m[1] : null;
  let commune = (m ? m[2] : lieu).trim();
  const lettres = commune.replace(/[^\p{L}]/gu, "");
  if (lettres.length > 1 && lettres === lettres.toUpperCase()) commune = capitaliser(commune);
  if (dept && departementVille && dept !== departementVille) return `${commune} (${dept})`;
  return commune;
}

export function masquerEmail(email: string) {
  const [local, domaine] = email.split("@");
  if (!domaine) return email;
  return `${local.slice(0, 3)}•••@${domaine}`;
}

export function joursDepuis(date: string | null) {
  if (!date) return null;
  const d = new Date(date).getTime();
  if (Number.isNaN(d)) return null;
  return Math.max(0, Math.floor((Date.now() - d) / 86_400_000));
}

const RE_HF = /(?<![\p{L}\d])\(?\s*(?:h\s*\/\s*f|f\s*\/\s*h)\s*\)?(?![\p{L}\d])/giu;

// Casse normale (jamais tout en majuscules) et un seul « (H/F) » par titre.
export function nettoyerTitre(titre: string) {
  let t = titre.trim();
  const avaitHF = new RegExp(RE_HF.source, "iu").test(t);
  t = t.replace(RE_HF, " ").replace(/\s{2,}/g, " ").replace(/[\s\-–—:/,]+$/, "").trim();
  const lettres = t.replace(/[^\p{L}]/gu, "");
  if (lettres.length > 3 && lettres === lettres.toUpperCase()) {
    t = t.toLowerCase();
    t = t.charAt(0).toUpperCase() + t.slice(1);
    t = t.replace(/(\s[-–/:]\s)(\p{L})/gu, (_, sep: string, l: string) => sep + l.toUpperCase());
  }
  // espace insécable : « (H/F) » ne reste jamais seul sur une ligne
  return avaitHF ? `${t} (H/F)` : t;
}

// Coupe sur un mot entier, jamais au milieu d'un mot.
export function tronquer(texte: string, max: number) {
  if (texte.length <= max) return texte;
  const coupe = texte.slice(0, max);
  const i = coupe.lastIndexOf(" ");
  const base = (i > max * 0.5 ? coupe.slice(0, i) : coupe).replace(/[\s\-–—:/,(]+$/, "");
  return `${base}…`;
}

export function champsAffichage(offre: OffreAffichee) {
  const commun = (contrat: string | null) => {
    const [nom, ...reste] = (contrat ?? "").split(" - ");
    return {
      contratNom: nom.trim(),
      contratDuree: reste.join(" - ").trim().toLowerCase(),
    };
  };

  if (offre.source === "commercant") {
    return {
      ...commun(offre.type_contrat),
      titre: nettoyerTitre(offre.poste),
      sousTitre: offre.nom_commerce,
      lieu: offre.quartier,
      contrat: offre.type_contrat,
      tempsTravail: offre.temps_travail,
      horaires: offre.horaires,
      description: offre.description,
      commentPostuler: offre.comment_postuler,
      datePublication: null as string | null,
      sourceLabel: "Commerçant du coin",
      imageUrl: offre.image_url,
      imageAlt: `Photo de ${offre.nom_commerce}`,
      estLogo: false,
      creditPexels: offre.image_source === "pexels" ? offre.pexels_photographe : null,
      estCommercant: true,
      latitude: null as number | null,
      longitude: null as number | null,
      salaireMin: null as number | null,
      salaireMax: null as number | null,
      salaireTexte: null as string | null,
    };
  }
  return {
    ...commun(offre.type_contrat),
    titre: nettoyerTitre(offre.intitule),
    sousTitre: offre.entreprise_nom,
    lieu: offre.lieu_travail,
    contrat: offre.type_contrat,
    tempsTravail: offre.duree_travail,
    horaires: null as string | null,
    description: offre.description,
    commentPostuler: null as string | null,
    datePublication: offre.date_publication,
    sourceLabel: "France Travail",
    imageUrl: offre.entreprise_logo_url,
    imageAlt: offre.entreprise_nom ? `Logo de ${offre.entreprise_nom}` : "",
    estLogo: true,
    creditPexels: null as string | null,
    estCommercant: false,
    latitude: offre.latitude ?? null,
    longitude: offre.longitude ?? null,
    salaireMin: offre.salaire_mensuel_min ?? null,
    salaireMax: offre.salaire_mensuel_max ?? null,
    salaireTexte: offre.salaire_libelle ?? null,
  };
}

// Distance en km entre le domicile du candidat et l'offre (les offres de commerçants sont situées au centre de la ville).
export function distanceOffre(offre: OffreAffichee, ctx: Contexte): number | null {
  if (!ctx.domicile) return null;
  const c = champsAffichage(offre);
  const point =
    c.latitude != null && c.longitude != null
      ? { latitude: c.latitude, longitude: c.longitude }
      : ctx.centreVille;
  return point ? distanceEntre(ctx.domicile, point) : null;
}

export function estNouvelle(offre: OffreAffichee) {
  if (offre.source !== "france_travail") return false;
  const j = joursDepuis(offre.date_publication);
  return j !== null && j <= 7;
}

export function correspond(offre: OffreAffichee, f: Filtres, ctx: Contexte) {
  const c = champsAffichage(offre);
  if (f.commercantsSeul && !c.estCommercant) return false;

  if (f.distanceKm != null && ctx.domicile) {
    const d = distanceOffre(offre, ctx);
    if (d === null || d > f.distanceKm) return false;
  }

  // Une offre sans salaire indiqué ne peut pas répondre à un salaire minimum
  if (f.salaireMin != null && (c.salaireMax ?? c.salaireMin ?? 0) < f.salaireMin) return false;

  if (f.contrats.length > 0) {
    const contrat = (c.contrat ?? "").toLowerCase();
    const ok = f.contrats.some((nom) =>
      (MOTS_CONTRAT[nom] ?? []).some((mot) => contrat.includes(mot))
    );
    if (!ok) return false;
  }

  const texteOffre = `${c.titre} ${c.sousTitre ?? ""}`.toLowerCase();

  if (f.secteur && themeDeOffre(c.titre, c.sousTitre) !== f.secteur) return false;

  const recherche = f.texte.trim().toLowerCase();
  if (recherche && !texteOffre.includes(recherche)) return false;

  return true;
}
