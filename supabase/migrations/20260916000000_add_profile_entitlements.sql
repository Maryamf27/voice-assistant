do $$
begin
  create type public.profile_plan as enum ('free', 'premium');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.profile_subscription_status as enum ('inactive', 'active');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists plan public.profile_plan not null default 'free',
  add column if not exists subscription_status public.profile_subscription_status not null default 'inactive';

update public.profiles
set plan = 'free', subscription_status = 'inactive'
where plan is null or subscription_status is null;

create or replace function public.prevent_client_entitlement_update()
returns trigger
language plpgsql
as $$
begin
  if (new.plan is distinct from old.plan
      or new.subscription_status is distinct from old.subscription_status)
     and current_user not in ('postgres', 'service_role') then
    raise exception 'profile entitlements can only be changed by a privileged server operation';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_entitlements on public.profiles;
create trigger protect_profile_entitlements
before update on public.profiles
for each row execute function public.prevent_client_entitlement_update();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, plan, subscription_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    'free',
    'inactive'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update (plan, subscription_status) on public.profiles from anon, authenticated;
comment on column public.profiles.plan is 'Database-owned entitlement plan; changed only by privileged server operations.';
comment on column public.profiles.subscription_status is 'Database-owned subscription state; changed only by privileged server operations.';

