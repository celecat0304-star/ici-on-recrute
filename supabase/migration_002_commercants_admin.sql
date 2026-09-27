-- Étape 4 — espace commerçant + admin minimal
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run

alter table offres_commercants add column if not exists siret text;
alter table offres_commercants add column if not exists tranche_effectif text;
alter table offres_commercants add column if not exists tranche_effectif_verifiee_le timestamptz;

-- Anti-spam : suit les dépôts par adresse IP (accès uniquement via la clé serveur)
create table if not exists depots_ip (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  created_at timestamptz not null default now()
);

alter table depots_ip enable row level security;
-- Aucune policy = aucun accès public (lecture/écriture uniquement via la clé service_role côté serveur)
