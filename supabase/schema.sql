create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


create table if not exists public.voices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('personal', 'designed', 'library')),
  fish_reference_id text,
  audio_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voices_user_id_idx on public.voices (user_id);
create index if not exists voices_user_id_type_idx on public.voices (user_id, type);

alter table public.voices enable row level security;

drop policy if exists "voices_select_own" on public.voices;
create policy "voices_select_own" on public.voices
  for select using (auth.uid() = user_id);

drop policy if exists "voices_insert_own" on public.voices;
create policy "voices_insert_own" on public.voices
  for insert with check (auth.uid() = user_id);

drop policy if exists "voices_update_own" on public.voices;
create policy "voices_update_own" on public.voices
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "voices_delete_own" on public.voices;
create policy "voices_delete_own" on public.voices
  for delete using (auth.uid() = user_id);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  input text,
  voice_id uuid references public.voices (id) on delete set null,
  voice_name text,
  model text,
  status text not null check (status in ('pending', 'processing', 'completed', 'failed')),
  audio_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generations_user_id_idx on public.generations (user_id);
create index if not exists generations_created_at_idx on public.generations (created_at desc);
create index if not exists generations_status_idx on public.generations (status);
create index if not exists generations_user_id_voice_id_idx on public.generations (user_id, voice_id);

alter table public.generations enable row level security;

drop policy if exists "generations_select_own" on public.generations;
create policy "generations_select_own" on public.generations
  for select using (auth.uid() = user_id);

drop policy if exists "generations_insert_own" on public.generations;
create policy "generations_insert_own" on public.generations
  for insert with check (auth.uid() = user_id);

drop policy if exists "generations_update_own" on public.generations;
create policy "generations_update_own" on public.generations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "generations_delete_own" on public.generations;
create policy "generations_delete_own" on public.generations
  for delete using (auth.uid() = user_id);

-- Keep updated_at current on any row change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.voices;
create trigger set_updated_at before update on public.voices
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.generations;
create trigger set_updated_at before update on public.generations
  for each row execute function public.set_updated_at();
insert into storage.buckets (id, name, public)
values ('generated-audio', 'generated-audio', false)
on conflict (id) do nothing;
drop policy if exists "generated_audio_select_own" on storage.objects;
create policy "generated_audio_select_own" on storage.objects
  for select using (
    bucket_id = 'generated-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "generated_audio_insert_own" on storage.objects;
create policy "generated_audio_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'generated-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "generated_audio_delete_own" on storage.objects;
create policy "generated_audio_delete_own" on storage.objects
  for delete using (
    bucket_id = 'generated-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
