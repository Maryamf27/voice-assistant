-- Step 5: Lemon Squeezy subscription metadata for webhook reconciliation.
alter table public.profiles
  add column if not exists lemonsqueezy_subscription_id text,
  add column if not exists lemonsqueezy_customer_id text,
  add column if not exists subscription_ends_at timestamptz;

create unique index if not exists profiles_lemonsqueezy_subscription_id_idx
  on public.profiles (lemonsqueezy_subscription_id)
  where lemonsqueezy_subscription_id is not null;

revoke update (lemonsqueezy_subscription_id, lemonsqueezy_customer_id, subscription_ends_at) from anon, authenticated;
