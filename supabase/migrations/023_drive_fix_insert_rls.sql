-- Fix : la policy INSERT `owner_id = auth.uid()` échoue parfois (session non
-- correctement attachée, ou mismatch d'UUID). On la remplace par une policy
-- plus permissive (auth.uid() not null) et on force `owner_id = auth.uid()`
-- via un trigger BEFORE INSERT, pour qu'on ne puisse pas usurper un autre user.

-- 1) Trigger BEFORE INSERT qui assigne owner_id à auth.uid()
create or replace function public.drive_force_owner_id()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    raise exception 'auth.uid() is null — utilisateur non authentifié';
  end if;
  new.owner_id := auth.uid();
  return new;
end $$;

drop trigger if exists trg_drive_force_owner on public.drive_projects;
create trigger trg_drive_force_owner
  before insert on public.drive_projects
  for each row execute function public.drive_force_owner_id();

-- 2) Policy INSERT plus permissive : tout user authentifié peut créer un
--    projet ; le trigger BEFORE garantit que owner_id sera auth.uid().
drop policy if exists "drive_projects_insert_self" on public.drive_projects;
create policy "drive_projects_insert_authed" on public.drive_projects
  for insert to authenticated
  with check (auth.uid() is not null);

-- 3) S'assurer que la policy SELECT est `to authenticated` aussi (sinon par
--    défaut elle s'applique à PUBLIC qui inclut anon — mais anon ne pourra
--    de toute façon pas passer drive_is_member, c'est juste plus propre).
drop policy if exists "drive_projects_select_member" on public.drive_projects;
create policy "drive_projects_select_member" on public.drive_projects
  for select to authenticated
  using (public.drive_is_member(id, auth.uid()));

drop policy if exists "drive_projects_update_owner" on public.drive_projects;
create policy "drive_projects_update_owner" on public.drive_projects
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "drive_projects_delete_owner" on public.drive_projects;
create policy "drive_projects_delete_owner" on public.drive_projects
  for delete to authenticated
  using (owner_id = auth.uid());
