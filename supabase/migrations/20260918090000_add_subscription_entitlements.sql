do $$
begin
  create type public.profile_plan as enum ('free', 'premium');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.profile_subscription_status as enum ('inactive', 'active');
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists plan public.profile_plan not null default 'free',
  add column if not exists subscription_status public.profile_subscription_status not null default 'inactive',
  add column if not exists lemonsqueezy_subscription_id text,
  add column if not exists lemonsqueezy_customer_id text,
  add column if not exists subscription_ends_at timestamptz;

create unique index if not exists profiles_lemonsqueezy_subscription_id_idx
  on public.profiles (lemonsqueezy_subscription_id)
  where lemonsqueezy_subscription_id is not null;

revoke update (lemonsqueezy_subscription_id, lemonsqueezy_customer_id, subscription_ends_at) from anon, authenticated;

update public.profiles
set plan = 'free', subscription_status = 'inactive'
where plan is null or subscription_status is null;

notify pgrst, 'reload schema';
