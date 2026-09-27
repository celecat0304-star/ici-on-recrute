-- Ici on recrute — schéma de base de données (étape 1)
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run

create extension if not exists "pgcrypto";

-- Villes clientes (mairies)
create table villes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  slug text not null unique,
  code_postal text not null,
  logo_url text,
  rayon_recherche_km integer not null default 10,
  created_at timestamptz not null default now()
);

-- Bornes tactiles installées dans les lieux de passage
create table bornes (
  id uuid primary key default gen_random_uuid(),
  ville_id uuid not null references villes(id) on delete cascade,
  nom text not null,
  lieu text not null,
  created_at timestamptz not null default now()
);

-- Cache local des offres France Travail (jamais lu en direct depuis l'API)
create table offres_france_travail (
  id uuid primary key default gen_random_uuid(),
  id_france_travail text not null unique,
  ville_id uuid not null references villes(id) on delete cascade,
  intitule text not null,
  description text,
  entreprise_nom text,
  type_contrat text,
  duree_travail text,
  lieu_travail text,
  url_origine text not null,
  date_publication timestamptz,
  date_maj timestamptz not null default now()
);

-- Offres déposées par les commerçants locaux
create table offres_commercants (
  id uuid primary key default gen_random_uuid(),
  ville_id uuid not null references villes(id) on delete cascade,
  nom_commerce text not null,
  poste text not null,
  type_contrat text not null check (type_contrat in ('CDI','CDD','Saisonnier','Extra','Apprentissage')),
  temps_travail text,
  horaires text,
  quartier text,
  description text check (char_length(description) <= 400),
  comment_postuler text not null,
  image_url text,
  image_source text check (image_source in ('upload','pexels','aucune')) default 'aucune',
  pexels_photographe text,
  pexels_url text,
  consentement_photo boolean not null default false,
  statut text not null check (statut in ('en_attente','publiee','refusee','expiree')) default 'en_attente',
  motif_refus text,
  date_expiration date,
  created_at timestamptz not null default now()
);

-- Événements de statistiques (aucune donnée personnelle)
create table evenements (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('vue','interet','qr_affiche','vue_site')),
  origine text not null check (origine in ('borne','site')),
  ville_id uuid not null references villes(id) on delete cascade,
  borne_id uuid references bornes(id) on delete set null,
  offre_type text not null check (offre_type in ('france_travail','commercant')),
  offre_id uuid not null,
  created_at timestamptz not null default now()
);

-- Sécurité : RLS activé sur toutes les tables
alter table villes enable row level security;
alter table bornes enable row level security;
alter table offres_france_travail enable row level security;
alter table offres_commercants enable row level security;
alter table evenements enable row level security;

-- Lecture publique (bornes et site public)
create policy "lecture publique villes" on villes for select using (true);
create policy "lecture publique bornes" on bornes for select using (true);
create policy "lecture publique offres france travail" on offres_france_travail for select using (true);
create policy "lecture publique offres commercants publiees" on offres_commercants for select using (statut = 'publiee');

-- Dépôt d'une offre commerçant par n'importe qui (reste "en attente" par défaut)
create policy "depot offre commercant" on offres_commercants for insert with check (statut = 'en_attente');

-- Envoi d'événements de stats par n'importe qui, aucune lecture publique
create policy "insertion evenements" on evenements for insert with check (true);

-- Donnée de test : ville pilote Rouen + une borne
insert into villes (nom, slug, code_postal, rayon_recherche_km)
values ('Rouen', 'rouen', '76000', 10);

insert into bornes (ville_id, nom, lieu)
select id, 'Borne Rive Gauche', 'Supermarché, rive gauche' from villes where slug = 'rouen';
