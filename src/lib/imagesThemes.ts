import donnees from "@/data/imagesThemes.json";

export type ImageIllustration = {
  url: string;
  photographe: string;
  lienPexels: string;
  couleur: string;
  theme: string;
};

type Photo = {
  url: string;
  photographe: string;
  lienPexels: string;
  couleur: string;
};

const BIBLIOTHEQUE = donnees as unknown as Record<string, Photo[]>;

// Du plus précis au plus général : le premier thème dont un mot apparaît dans le titre gagne.
const MOTS_THEMES: [string, string[]][] = [
  ["securite", ["securite", "surveillan", "gardien", "vigile"]],
  ["informatique", ["developpeu", "informatique", "informaticien", "logiciel", "reseau", "data"]],
  ["enfance", ["puericult", "petite enfance", "enfance", "educat", "enseign", "animateur", "animatrice", "periscolaire", "creche", "atsem", "maternelle", "scolaire", "professeur"]],
  ["sante", ["infirm", "soignant", "sante", "medical", "aide a domicile", "auxiliaire de vie", "assistant de vie", "assistante de vie", "pharmac", "kine", "dentaire", "ehpad", "hopital", "ambulanc"]],
  ["proprete", ["nettoy", "proprete", "menage", "entretien des locaux", "agent d'entretien", "agent d entretien", "lingere", "lingerie", "pressing"]],
  ["hotellerie", ["hotel", "receptionn", "bagagiste", "voiturier", "concierge", "gouvernant", "femme de chambre", "valet"]],
  ["restauration", ["cuisin", "serveu", "restaura", "commis", "barman", "barista", "plongeur", "traiteur", "pizza", "patiss", "boulanger"]],
  ["batiment", ["batiment", "macon", "peintre", "menuisier", "plaquiste", "couvreur", "chantier", "carreleur", "plombier", "grutier", "echafaud"]],
  ["espacesverts", ["jardin", "espaces verts", "paysag", "viticult", "vendang", "agricol", "elagu"]],
  ["industrie", ["production", "fabrication", "operateur", "mecanicien", "electricien", "electromecan", "technicien", "maintenance", "soudeur", "usine", "conducteur de ligne", "automatic", "conditionn"]],
  ["logistique", ["logisti", "livreur", "chauffeur", "cariste", "magasinier", "preparateur de commandes", "manutention", "conducteur", "demenageur", "transport", "coursier", "manoeuvre"]],
  ["administration", ["administratif", "secretaire", "comptab", "gestionnaire", "assistant", "accueil", "paie", "conseiller", "charge de", "recouvrement", "juridique", "banque", "assurance", "teleconseill", "relation client"]],
  ["commerce", ["vend", "vente", "caiss", "magasin", "commercial", "boulang", "rayon", "fruits", "polyvalent", "libre-service", "fleuriste", "boucher", "poissonn", "adjoint responsable"]],
];

function normaliser(texte: string) {
  return texte
    .toLowerCase()
    .replace(/œ/g, "oe")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function themeDeOffre(titre: string, sousTitre?: string | null) {
  const texte = normaliser(`${titre} ${sousTitre ?? ""}`);
  for (const [theme, mots] of MOTS_THEMES) {
    if (mots.some((mot) => texte.includes(mot))) return theme;
  }
  return "general";
}

function hash(texte: string) {
  let h = 0;
  for (let i = 0; i < texte.length; i++) h = (h * 31 + texte.charCodeAt(i)) >>> 0;
  return h;
}

// Une même offre reçoit toujours la même photo ; deux offres du même thème varient.
export function imageIllustration(
  titre: string,
  sousTitre: string | null | undefined,
  cle: string
): ImageIllustration {
  const theme = themeDeOffre(titre, sousTitre);
  const pool = BIBLIOTHEQUE[theme]?.length ? BIBLIOTHEQUE[theme] : BIBLIOTHEQUE.general;
  const photo = pool[hash(cle) % pool.length];
  return { ...photo, theme };
}
