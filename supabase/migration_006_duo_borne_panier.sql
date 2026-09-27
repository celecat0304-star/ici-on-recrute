-- Écran borne en duo + panier candidat

-- Taille d'entreprise pour les offres France Travail
alter table offres_france_travail add column if not exists tranche_effectif text;

-- Distinction commerçant / grande entreprise payante
alter table offres_commercants add column if not exists categorie text not null default 'commercant'
  check (categorie in ('commercant', 'entreprise'));
alter table offres_commercants add column if not exists abonnement_actif boolean not null default false;

-- Ajout du nouveau type d'evenement "selection" (ajout au panier)
alter table evenements drop constraint if exists evenements_type_check;
alter table evenements add constraint evenements_type_check
  check (type in ('vue','interet','qr_affiche','vue_site','candidature','selection'));

-- Panier envoyé par e-mail depuis la borne
create table if not exists paniers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ville_id uuid not null references villes(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists panier_offres (
  id uuid primary key default gen_random_uuid(),
  panier_id uuid not null references paniers(id) on delete cascade,
  offre_type text not null check (offre_type in ('france_travail','commercant')),
  offre_id uuid not null,
  created_at timestamptz not null default now()
);

alter table paniers enable row level security;
alter table panier_offres enable row level security;

-- Lecture publique par id (l'id sert de jeton d'accès, comme pour les offres)
create policy "lecture publique panier" on paniers for select using (true);
create policy "lecture publique panier_offres" on panier_offres for select using (true);
