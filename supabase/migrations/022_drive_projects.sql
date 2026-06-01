-- Drive : projets collaboratifs avec fichiers et invitations.
--
-- Modèle :
--   drive_projects          : un projet (= dossier racine partageable)
--   drive_project_members   : qui a accès et avec quel rôle
--   drive_files             : fichiers et sous-dossiers d'un projet
--   drive_invites           : tokens d'invitation par lien

create extension if not exists "pgcrypto";

-- ─── projects ──────────────────────────────────────────────────────────
create table if not exists public.drive_projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_drive_projects_owner on public.drive_projects(owner_id);

-- ─── members ───────────────────────────────────────────────────────────
create table if not exists public.drive_project_members (
  project_id  uuid not null references public.drive_projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'editor' check (role in ('owner','editor','viewer')),
  added_at    timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists idx_drive_members_user on public.drive_project_members(user_id);

-- Auto-ajoute le créateur comme owner.
create or replace function public.drive_add_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.drive_project_members(project_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists trg_drive_add_owner on public.drive_projects;
create trigger trg_drive_add_owner
  after insert on public.drive_projects
  for each row execute function public.drive_add_owner_member();

-- ─── files ─────────────────────────────────────────────────────────────
-- type 'doc'    : document texte stocké dans `content`
-- type 'file'   : fichier binaire stocké dans Supabase Storage (storage_path)
-- type 'folder' : sous-dossier (regroupe d'autres entrées)
create table if not exists public.drive_files (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.drive_projects(id) on delete cascade,
  parent_id     uuid references public.drive_files(id) on delete cascade,
  name          text not null,
  type          text not null check (type in ('doc','file','folder')),
  content       text,
  storage_path  text,
  mime_type     text,
  size_bytes    bigint,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_drive_files_project on public.drive_files(project_id);
create index if not exists idx_drive_files_parent  on public.drive_files(parent_id);

-- ─── invites ───────────────────────────────────────────────────────────
create table if not exists public.drive_invites (
  token       text primary key default encode(gen_random_bytes(18), 'hex'),
  project_id  uuid not null references public.drive_projects(id) on delete cascade,
  role        text not null default 'editor' check (role in ('editor','viewer')),
  created_by  uuid not null references auth.users(id) on delete cascade,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_drive_invites_project on public.drive_invites(project_id);

-- ─── RLS ───────────────────────────────────────────────────────────────
alter table public.drive_projects        enable row level security;
alter table public.drive_project_members enable row level security;
alter table public.drive_files           enable row level security;
alter table public.drive_invites         enable row level security;

-- Helper : appartient au projet ?
create or replace function public.drive_is_member(p_project uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.drive_project_members m
    where m.project_id = p_project and m.user_id = p_user
  );
$$;

create or replace function public.drive_is_owner(p_project uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.drive_projects p
    where p.id = p_project and p.owner_id = p_user
  );
$$;

-- projects
drop policy if exists "drive_projects_select_member" on public.drive_projects;
create policy "drive_projects_select_member" on public.drive_projects
  for select using (public.drive_is_member(id, auth.uid()));

drop policy if exists "drive_projects_insert_self" on public.drive_projects;
create policy "drive_projects_insert_self" on public.drive_projects
  for insert with check (owner_id = auth.uid());

drop policy if exists "drive_projects_update_owner" on public.drive_projects;
create policy "drive_projects_update_owner" on public.drive_projects
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "drive_projects_delete_owner" on public.drive_projects;
create policy "drive_projects_delete_owner" on public.drive_projects
  for delete using (owner_id = auth.uid());

-- members
drop policy if exists "drive_members_select_member" on public.drive_project_members;
create policy "drive_members_select_member" on public.drive_project_members
  for select using (public.drive_is_member(project_id, auth.uid()));

-- Insert : soit l'owner ajoute quelqu'un, soit l'utilisateur s'ajoute lui-même
-- (cas où il vient d'accepter une invitation — la validation du token est
-- assurée côté API/RPC, ici on autorise simplement l'ajout de sa propre row).
drop policy if exists "drive_members_insert" on public.drive_project_members;
create policy "drive_members_insert" on public.drive_project_members
  for insert with check (
    user_id = auth.uid() or public.drive_is_owner(project_id, auth.uid())
  );

drop policy if exists "drive_members_update_owner" on public.drive_project_members;
create policy "drive_members_update_owner" on public.drive_project_members
  for update using (public.drive_is_owner(project_id, auth.uid()))
  with check (public.drive_is_owner(project_id, auth.uid()));

drop policy if exists "drive_members_delete" on public.drive_project_members;
create policy "drive_members_delete" on public.drive_project_members
  for delete using (
    public.drive_is_owner(project_id, auth.uid()) or user_id = auth.uid()
  );

-- files
drop policy if exists "drive_files_select_member" on public.drive_files;
create policy "drive_files_select_member" on public.drive_files
  for select using (public.drive_is_member(project_id, auth.uid()));

drop policy if exists "drive_files_insert_member" on public.drive_files;
create policy "drive_files_insert_member" on public.drive_files
  for insert with check (public.drive_is_member(project_id, auth.uid()));

drop policy if exists "drive_files_update_member" on public.drive_files;
create policy "drive_files_update_member" on public.drive_files
  for update using (public.drive_is_member(project_id, auth.uid()))
  with check (public.drive_is_member(project_id, auth.uid()));

drop policy if exists "drive_files_delete_member" on public.drive_files;
create policy "drive_files_delete_member" on public.drive_files
  for delete using (public.drive_is_member(project_id, auth.uid()));

-- invites : un invité non-membre doit pouvoir lire le row à partir de son token
-- pour récupérer le project_id. On laisse le SELECT ouvert aux authentifiés
-- (token = secret), l'insert/delete réservés aux membres du projet.
drop policy if exists "drive_invites_select_auth" on public.drive_invites;
create policy "drive_invites_select_auth" on public.drive_invites
  for select to authenticated using (true);

drop policy if exists "drive_invites_insert_member" on public.drive_invites;
create policy "drive_invites_insert_member" on public.drive_invites
  for insert with check (
    created_by = auth.uid() and public.drive_is_member(project_id, auth.uid())
  );

drop policy if exists "drive_invites_delete_member" on public.drive_invites;
create policy "drive_invites_delete_member" on public.drive_invites
  for delete using (public.drive_is_member(project_id, auth.uid()));

-- ─── Storage bucket ────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('drive_files', 'drive_files', false)
on conflict (id) do nothing;

-- Chemin attendu : {project_id}/{file_id}/{filename}
-- L'accès est conditionné à l'appartenance au projet (premier segment).
drop policy if exists "drive_storage_select_member" on storage.objects;
create policy "drive_storage_select_member"
on storage.objects for select
to authenticated
using (
  bucket_id = 'drive_files'
  and public.drive_is_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

drop policy if exists "drive_storage_insert_member" on storage.objects;
create policy "drive_storage_insert_member"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'drive_files'
  and public.drive_is_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

drop policy if exists "drive_storage_update_member" on storage.objects;
create policy "drive_storage_update_member"
on storage.objects for update
to authenticated
using (
  bucket_id = 'drive_files'
  and public.drive_is_member(((storage.foldername(name))[1])::uuid, auth.uid())
)
with check (
  bucket_id = 'drive_files'
  and public.drive_is_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

drop policy if exists "drive_storage_delete_member" on storage.objects;
create policy "drive_storage_delete_member"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'drive_files'
  and public.drive_is_member(((storage.foldername(name))[1])::uuid, auth.uid())
);
