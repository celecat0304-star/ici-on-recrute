-- Étape "candidature en ligne" — e-mail de contact du commerçant + type d'événement

alter table offres_commercants add column if not exists email_contact text;

alter table evenements drop constraint if exists evenements_type_check;
alter table evenements add constraint evenements_type_check
  check (type in ('vue','interet','qr_affiche','vue_site','candidature'));
