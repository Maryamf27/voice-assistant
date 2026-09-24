alter table public.profiles
  add column if not exists subscription_renews_at timestamptz;

revoke update (subscription_renews_at) from anon, authenticated;
