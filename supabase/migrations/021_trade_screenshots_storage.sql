-- Create the trade_screenshots bucket and RLS policies on storage.objects
-- so authenticated users can upload screenshots under their own folder.

insert into storage.buckets (id, name, public)
values ('trade_screenshots', 'trade_screenshots', true)
on conflict (id) do update set public = true;

-- Drop any prior versions of these policies (idempotent migration)
drop policy if exists "trade_screenshots read public" on storage.objects;
drop policy if exists "trade_screenshots insert own" on storage.objects;
drop policy if exists "trade_screenshots update own" on storage.objects;
drop policy if exists "trade_screenshots delete own" on storage.objects;

-- Public read (bucket is public; this also enables signed URLs for non-public setups)
create policy "trade_screenshots read public"
on storage.objects for select
using (bucket_id = 'trade_screenshots');

-- Authenticated users can upload only into their own user_id folder
create policy "trade_screenshots insert own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'trade_screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "trade_screenshots update own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'trade_screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'trade_screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "trade_screenshots delete own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'trade_screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);
