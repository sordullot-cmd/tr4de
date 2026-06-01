-- Étend les types de cartes du Drive : ajoute 'draw' (dessin SVG) et 'audio'
-- (piste audio stockée dans Supabase Storage).

alter table public.drive_files
  drop constraint if exists drive_files_type_check;

alter table public.drive_files
  add constraint drive_files_type_check
  check (type in ('doc', 'file', 'folder', 'link', 'video', 'task', 'draw', 'audio'));
