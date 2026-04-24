-- Key/value JSON store pour toutes les pages de Productivité.
-- Chaque ligne = une feature (goals, habits, habits_history, daily_planner,
-- daily_notes, focus_sessions, books...) pour un user donné.
create table if not exists public.user_productivity (
  user_id     uuid not null references auth.users(id) on delete cascade,
  key         text not null,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, key)
);

create index if not exists idx_user_productivity_user on public.user_productivity(user_id);

-- RLS : chaque user ne voit/modifie que ses propres lignes.
alter table public.user_productivity enable row level security;

drop policy if exists "user_productivity_select_own" on public.user_productivity;
create policy "user_productivity_select_own" on public.user_productivity
  for select using (auth.uid() = user_id);

drop policy if exists "user_productivity_insert_own" on public.user_productivity;
create policy "user_productivity_insert_own" on public.user_productivity
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_productivity_update_own" on public.user_productivity;
create policy "user_productivity_update_own" on public.user_productivity
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_productivity_delete_own" on public.user_productivity;
create policy "user_productivity_delete_own" on public.user_productivity
  for delete using (auth.uid() = user_id);
