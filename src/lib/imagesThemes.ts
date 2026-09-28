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
  ["securite", ["securite", "surveillan", "gardien", "vigile", "maitre chien", "maitre-chien", "agent de prevention"]],
  ["informatique", ["developpeu", "informatique", "informaticien", "logiciel", "devops", "cybersecu", "administrateur systeme", "data analyst", "data scientist"]],
  ["enfance", ["puericult", "petite enfance", "enfance", "d'enfants", "educat", "enseign", "animateur", "animatrice", "periscolaire", "creche", "atsem", "maternelle", "scolaire", "professeur", "nounou", "baby-sitter", "d'enfant", "cours particuliers", "prof de", "mathematiques"]],
  ["beaute", ["coiffeu", "coiffure", "estheticien", "barbier", "manucur", "ongulaire", "maquilleu"]],
  ["sante", ["infirm", "soignant", "sante", "medical", "medico", "medecin", "aide a domicile", "auxiliaire de vie", "assistant de vie", "assistante de vie", "maintien a domicile", "pharmac", "kine", "dentaire", "dentiste", "chirurg", "psycholog", "psychomotric", "orthophon", "ergotherap", "sage-femme", "generaliste", "ehpad", "hopital", "hospitalier", "ambulanc", "brancardier", "social", "ophtalm", "orthopt", "orthoped", "implantolog", "sterilisation", "aidant", "domicile", "thanatopracteur"]],
  ["proprete", ["nettoy", "proprete", "menage", "entretien des locaux", "d'entretien", "d entretien", "lingere", "lingerie", "pressing"]],
  ["hotellerie", ["hotel", "receptionn", "bagagiste", "voiturier", "concierge", "gouvernant", "femme de chambre", "valet", "maitre d'hotel"]],
  ["restauration", ["cuisin", "serveu", "restaura", "commis", "barman", "barista", "plongeur", "traiteur", "pizza", "patiss", "boulanger", "chef de partie", "chef de rang", "sommelier", "equipier", "brasserie", "snack"]],
  ["batiment", ["batiment", "macon", "peintre", "menuisier", "menuiserie", "plaquiste", "couvreur", "chantier", "carreleur", "plombier", "grutier", "echafaud", "etancheur", "coffreur", "facadier", "bancheur", "ferrailleur", "canalisateur", "frigoriste", "chauffagiste", "serrurier", "charpentier", "bardeur", "metallier", "poseur", "travaux", "construction", "conducteur d'engins", "second oeuvre", "gros oeuvre", "terrassier", "tailleur de pierre", "dessinateur", "projeteur", "chiffreur", "climaticien", "climatisation", "tuyauteur", "solier", "ravaleur", "manchonneur", "marbrier", "geometre", "beton"]],
  ["espacesverts", ["jardin", "espaces verts", "paysag", "viticult", "vendang", "agricol", "elagu", "viticole", "cueilleu"]],
  ["industrie", ["production", "fabrication", "operateur", "mecanicien", "electricien", "electromecan", "technicien", "maintenance", "soudeur", "usine", "conducteur de ligne", "automatic", "conditionn", "tourneur", "fraiseur", "chaudronn", "monteur", "ingenieur", "controleur", "qualite", "thermicien", "outilleur", "usineur", "regleur", "electronicien", "decoupeur", "ebarbeur", "thermoformeur", "pilote de ligne", "tailleur", "tailleuse"]],
  ["logistique", ["logisti", "livreur", "chauffeur", "cariste", "magasinier", "preparateur", "approvisionneur", "manutention", "conducteur", "demenageur", "transport", "coursier", "manoeuvre", "agent de quai", "agent de tri", "expedition", "douane", "declarant", "affret", "transit", "portage"]],
  ["administration", ["administratif", "secretaire", "comptab", "gestionnaire", "assistant", "accueil", "paie", "conseiller", "charge de", "charge d'", "chargee", "recouvrement", "juridique", "banque", "assurance", "teleconseill", "relation client", "immobilier", "negociateur", "recenseur", "coordinat", "coordonnat", "formateur", "formatrice", "recrutement", "consultant", "auditeur", "affaires", "gestion", "deviseur", "acheteur", "enqueteur", "marketeur", "marketing", "recruteur", "franchise", "assitant", "administrateur", "exploitant", "gerant", "voyage", "attributions", "facilities"]],
  ["commerce", ["vend", "vente", "caiss", "magasin", "commercial", "boulang", "rayon", "fruits", "polyvalent", "libre-service", "libre service", "libre serve", "fleuriste", "boucher", "poissonn", "adjoint responsable"]],
  // Postes d'encadrement sans métier précis : photo de bureau
  ["administration", ["responsable", "chef", "directeur", "directrice", "manager", "adjoint"]],
];

function normaliser(texte: string) {
  return texte
    .toLowerCase()
    .replace(/œ/g, "oe")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function chercherTheme(texte: string) {
  const t = normaliser(texte);
  for (const [theme, mots] of MOTS_THEMES) {
    if (mots.some((mot) => t.includes(mot))) return theme;
  }
  return null;
}

// Le titre décide en premier (le nom de l'entreprise peut tromper : « RESEAU TALENTS »
// n'est pas un métier du réseau) ; l'entreprise ne sert qu'en dernier recours.
export function themeDeOffre(titre: string, sousTitre?: string | null) {
  return chercherTheme(titre) ?? (sousTitre ? chercherTheme(sousTitre) : null) ?? "general";
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
