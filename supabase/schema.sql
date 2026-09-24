-- Des & Jett — one table for every record, one bucket for photos and voice notes.
create table if not exists public.docs (
  id text primary key,
  collection text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.docs enable row level security;
-- Only signed-in people (the two of you) can read or write.
create policy "signed in can read"  on public.docs for select using (auth.role() = 'authenticated');
create policy "signed in can write" on public.docs for insert with check (auth.role() = 'authenticated');
create policy "signed in can update" on public.docs for update using (auth.role() = 'authenticated');
create policy "signed in can delete" on public.docs for delete using (auth.role() = 'authenticated');
alter publication supabase_realtime add table public.docs;

-- Storage bucket for photos, polaroids and voice notes (private).
insert into storage.buckets (id, name, public) values ('assets', 'assets', false) on conflict do nothing;
create policy "signed in read assets"  on storage.objects for select using (bucket_id = 'assets' and auth.role() = 'authenticated');
create policy "signed in write assets" on storage.objects for insert with check (bucket_id = 'assets' and auth.role() = 'authenticated');
create policy "signed in update assets" on storage.objects for update using (bucket_id = 'assets' and auth.role() = 'authenticated');
