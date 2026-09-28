-- Parcours candidat : filtres personnalisés (distance, salaire) et candidature commune.

-- Coordonnées et salaire des offres France Travail
alter table offres_france_travail
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists salaire_libelle text,
  add column if not exists salaire_mensuel_min integer,
  add column if not exists salaire_mensuel_max integer;

-- Centre de la ville (sert au calcul de distance pour les offres des commerçants)
alter table villes
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

-- Candidature commune : un candidat, une candidature envoyée à tous les commerçants de son panier
create table if not exists candidatures_communes (
  id uuid primary key default gen_random_uuid(),
  panier_id uuid references paniers(id) on delete set null,
  prenom text not null,
  nom text not null,
  email text not null,
  telephone text,
  message text,
  cv_chemin text,
  cv_nom text,
  nb_destinataires integer not null default 0,
  consentement_le timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Aucune policy : accessible uniquement par le serveur (clé service)
alter table candidatures_communes enable row level security;
