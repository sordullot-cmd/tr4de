-- Canvas Milanote : ajoute position/taille/couleur aux drive_files pour
-- pouvoir les disposer librement sur un canvas par projet.

alter table public.drive_files
  add column if not exists pos_x  double precision not null default 40,
  add column if not exists pos_y  double precision not null default 40,
  add column if not exists width  double precision not null default 240,
  add column if not exists height double precision not null default 180,
  add column if not exists color  text;
