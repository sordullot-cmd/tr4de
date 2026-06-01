-- Étend les types de cartes du Drive : ajoute 'link', 'video', 'task'.
-- Ajoute aussi une colonne `done` pour l'état des tâches.

alter table public.drive_files
  drop constraint if exists drive_files_type_check;

alter table public.drive_files
  add constraint drive_files_type_check
  check (type in ('doc', 'file', 'folder', 'link', 'video', 'task'));

alter table public.drive_files
  add column if not exists done boolean not null default false;
