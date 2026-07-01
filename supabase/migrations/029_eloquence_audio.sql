-- Crée le bucket eloquence_audio (privé) et les policies RLS sur storage.objects
-- pour que chaque utilisateur authentifié ne gère que ses propres enregistrements,
-- rangés sous un dossier à son user_id. La lecture se fait par URL signée.

insert into storage.buckets (id, name, public)
values ('eloquence_audio', 'eloquence_audio', false)
on conflict (id) do update set public = false;

-- Idempotence : on supprime d'éventuelles versions antérieures des policies.
drop policy if exists "eloquence_audio read own" on storage.objects;
drop policy if exists "eloquence_audio insert own" on storage.objects;
drop policy if exists "eloquence_audio delete own" on storage.objects;

-- Lecture réservée au propriétaire (bucket privé → sert les URL signées).
create policy "eloquence_audio read own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'eloquence_audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Upload uniquement dans son propre dossier user_id.
create policy "eloquence_audio insert own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'eloquence_audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "eloquence_audio delete own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'eloquence_audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);
