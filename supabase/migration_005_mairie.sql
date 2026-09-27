-- Étape 8 — comptes mairie et isolation par ville au niveau RLS

create table if not exists comptes_mairie (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  ville_id uuid not null references villes(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table comptes_mairie enable row level security;

create policy "une mairie lit sa propre ligne" on comptes_mairie
  for select using (user_id = auth.uid());

-- Une mairie peut lire les événements de sa ville (et seulement de sa ville)
create policy "mairie lit les evenements de sa ville" on evenements
  for select using (
    ville_id in (select ville_id from comptes_mairie where user_id = auth.uid())
  );
