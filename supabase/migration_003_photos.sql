-- Étape 5 — photos (upload commerçant + cache Pexels)

create table if not exists pexels_cache (
  mot_cle text primary key,
  resultats jsonb not null,
  cree_le timestamptz not null default now()
);

alter table pexels_cache enable row level security;
-- Aucune policy = accès uniquement via la clé service_role côté serveur
