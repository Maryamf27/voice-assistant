-- Persist the Lemon Squeezy variant and resolved billing package so the pricing
-- page can distinguish monthly vs yearly without a live provider lookup.
alter table public.profiles
  add column if not exists lemonsqueezy_variant_id text,
  add column if not exists premium_package_id text;

alter table public.profiles
  drop constraint if exists profiles_premium_package_id_check;

alter table public.profiles
  add constraint profiles_premium_package_id_check
  check (premium_package_id is null or premium_package_id in ('monthly', 'yearly'));

revoke update (lemonsqueezy_variant_id, premium_package_id) from anon, authenticated;

notify pgrst, 'reload schema';
