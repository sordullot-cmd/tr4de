-- Permet de verrouiller un projet pour éviter de le déplacer/redimensionner/
-- supprimer par accident depuis le canvas des projets.

alter table public.drive_projects
  add column if not exists locked boolean not null default false;
