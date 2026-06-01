-- Positions des cartes de projet sur le canvas "projets" (niveau 1 du Drive).
-- Chaque utilisateur voit potentiellement les mêmes projets à des positions
-- différentes ? Non : pour simplifier, la position est globale (partagée par
-- tous les membres). Si on veut une vue par utilisateur, on pourra ajouter une
-- table de jonction.

alter table public.drive_projects
  add column if not exists pos_x  double precision not null default 80,
  add column if not exists pos_y  double precision not null default 80,
  add column if not exists width  double precision not null default 240,
  add column if not exists height double precision not null default 140,
  add column if not exists color  text;
