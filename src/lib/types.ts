export type OffreFranceTravail = {
  id: string;
  id_france_travail: string;
  ville_id: string;
  intitule: string;
  description: string | null;
  entreprise_nom: string | null;
  entreprise_logo_url: string | null;
  type_contrat: string | null;
  duree_travail: string | null;
  lieu_travail: string | null;
  url_origine: string;
  date_publication: string | null;
  date_maj: string;
  tranche_effectif: string | null;
};

export type OffreCommercantPublique = {
  id: string;
  ville_id: string;
  nom_commerce: string;
  poste: string;
  type_contrat: string;
  temps_travail: string | null;
  horaires: string | null;
  quartier: string | null;
  description: string | null;
  comment_postuler: string;
  image_url: string | null;
  image_source: string | null;
  pexels_photographe: string | null;
  categorie: "commercant" | "entreprise";
  abonnement_actif: boolean;
};

export type OffreAffichee =
  | ({ source: "commercant" } & OffreCommercantPublique)
  | ({ source: "france_travail" } & OffreFranceTravail);
