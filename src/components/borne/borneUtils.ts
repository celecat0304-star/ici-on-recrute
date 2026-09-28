import type { OffreAffichee } from "@/lib/types";

export type Filtres = {
  texte: string;
  secteur: string | null;
  contrats: string[];
  commercantsSeul: boolean;
};

export const FILTRES_VIDES: Filtres = {
  texte: "",
  secteur: null,
  contrats: [],
  commercantsSeul: false,
};

export const CONTRATS = ["CDI", "CDD", "Intérim", "Alternance", "Saisonnier"];

const MOTS_CONTRAT: Record<string, string[]> = {
  CDI: ["cdi"],
  CDD: ["cdd"],
  Intérim: ["intérim", "interim", "mission"],
  Alternance: ["altern", "apprenti", "professionnalisation"],
  Saisonnier: ["saison"],
};

// Les secteurs sont déduits des mots du titre : l'offre n'a pas de champ « secteur ».
export const SECTEURS: { id: string; libelle: string; mots: string[] }[] = [
  { id: "commerce", libelle: "Commerce", mots: ["vend", "vente", "caiss", "magasin", "commercial", "boulang", "rayon", "fruits"] },
  { id: "administration", libelle: "Administration", mots: ["administratif", "secrétaire", "comptab", "gestionnaire", "assistant", "accueil", "paie"] },
  { id: "industrie", libelle: "Industrie", mots: ["production", "fabrication", "opérateur", "mécanicien", "électricien", "technicien", "maintenance", "soudeur", "usine"] },
  { id: "logistique", libelle: "Logistique", mots: ["logisti", "livreur", "chauffeur", "cariste", "magasinier", "préparateur de commandes", "manutention", "conducteur"] },
  { id: "sante", libelle: "Santé", mots: ["santé", "infirm", "soignant", "médical", "puéricult", "aide à domicile", "auxiliaire de vie", "assistant de vie", "éducat", "social"] },
  { id: "restauration", libelle: "Restauration", mots: ["cuisin", "serveu", "restaura", "commis", "barman", "plongeur", "traiteur"] },
  { id: "batiment", libelle: "Bâtiment", mots: ["bâtiment", "maçon", "peintre", "menuisier", "plaquiste", "couvreur", "chantier", "carreleur"] },
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
  return avaitHF ? `${t} (H/F)` : t;
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
  };
}

export function estNouvelle(offre: OffreAffichee) {
  if (offre.source !== "france_travail") return false;
  const j = joursDepuis(offre.date_publication);
  return j !== null && j <= 7;
}

export function correspond(offre: OffreAffichee, f: Filtres) {
  const c = champsAffichage(offre);
  if (f.commercantsSeul && !c.estCommercant) return false;

  if (f.contrats.length > 0) {
    const contrat = (c.contrat ?? "").toLowerCase();
    const ok = f.contrats.some((nom) =>
      (MOTS_CONTRAT[nom] ?? []).some((mot) => contrat.includes(mot))
    );
    if (!ok) return false;
  }

  const texteOffre = `${c.titre} ${c.sousTitre ?? ""}`.toLowerCase();

  if (f.secteur) {
    const secteur = SECTEURS.find((s) => s.id === f.secteur);
    if (secteur && !secteur.mots.some((mot) => texteOffre.includes(mot))) return false;
  }

  const recherche = f.texte.trim().toLowerCase();
  if (recherche && !texteOffre.includes(recherche)) return false;

  return true;
}
