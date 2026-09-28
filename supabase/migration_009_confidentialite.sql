-- Confidentialité : masquer les données personnelles aux visiteurs.
-- À exécuter en DEUX temps (partie A, puis partie B après le déploiement du code).

-- ========== PARTIE A (sans risque) ==========
-- Le site public a seulement besoin de savoir si l'offre accepte les candidatures,
-- pas de connaître l'adresse e-mail du commerçant.
alter table offres_commercants
  add column if not exists accepte_candidatures boolean
  generated always as (email_contact is not null and email_contact <> '') stored;

-- ========== PARTIE B (après le déploiement du nouveau code) ==========
-- Les visiteurs (clé publique) ne peuvent plus lire :
--   - paniers.email
--   - offres_commercants.email_contact et offres_commercants.siret
-- Toutes les autres colonnes restent lisibles. Le serveur (clé service) n'est pas concerné.
do $$
declare
  cols_paniers text;
  cols_offres text;
begin
  select string_agg(quote_ident(column_name), ', ') into cols_paniers
  from information_schema.columns
  where table_schema = 'public' and table_name = 'paniers'
    and column_name not in ('email');

  select string_agg(quote_ident(column_name), ', ') into cols_offres
  from information_schema.columns
  where table_schema = 'public' and table_name = 'offres_commercants'
    and column_name not in ('email_contact', 'siret');

  execute 'revoke select on public.paniers from anon, authenticated';
  execute format('grant select (%s) on public.paniers to anon, authenticated', cols_paniers);

  execute 'revoke select on public.offres_commercants from anon, authenticated';
  execute format('grant select (%s) on public.offres_commercants to anon, authenticated', cols_offres);
end $$;
