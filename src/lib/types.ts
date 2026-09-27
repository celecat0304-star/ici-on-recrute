export type OffreFranceTravail = {
  id: string;
  id_france_travail: string;
  ville_id: string;
  intitule: string;
  description: string | null;
  entreprise_nom: string | null;
  type_contrat: string | null;
  duree_travail: string | null;
  lieu_travail: string | null;
  url_origine: string;
  date_publication: string | null;
  date_maj: string;
};
