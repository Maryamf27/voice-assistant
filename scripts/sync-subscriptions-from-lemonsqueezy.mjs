import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "LEMON_SQUEEZY_API_KEY"]) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const userFlag = args.indexOf("--user");
const onlyUser = userFlag >= 0 ? args[userFlag + 1] : null;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchSubscription(id) {
  const res = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`, Accept: "application/vnd.api+json" },
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, httpStatus: res.status };
  const json = await res.json();
  const a = json?.data?.attributes;
  if (!a) return { ok: false, httpStatus: "no-attributes" };
  return {
    ok: true,
    status: a.status ?? null,
    renewsAt: a.renews_at ?? null,
    endsAt: a.ends_at ?? null,
  };
}

// Same rules as the webhook / lib/premium-access.ts.
function profileStateFor({ status, endsAt }) {
  if (status === "active" || status === "on_trial") {
    return { plan: "premium", subscription_status: "active" };
  }
  if (status === "cancelled" && endsAt && Date.parse(endsAt) > Date.now()) {
    return { plan: "premium", subscription_status: "cancelled" };
  }
  return { plan: "free", subscription_status: "inactive" };
}

let query = supabase
  .from("profiles")
  .select("id, email, plan, subscription_status, lemonsqueezy_subscription_id, subscription_renews_at, subscription_ends_at")
  .not("lemonsqueezy_subscription_id", "is", null);
if (onlyUser) query = query.eq("id", onlyUser);

const { data: profiles, error } = await query;
if (error) {
  console.error("Could not load profiles:", error);
  process.exit(2);
}

console.log(`${apply ? "APPLY" : "DRY RUN"}: ${profiles.length} profile(s) with a Lemon Squeezy subscription id\n`);

let changed = 0;
let skipped = 0;

for (const profile of profiles) {
  const subscriptionId = profile.lemonsqueezy_subscription_id;
  const live = await fetchSubscription(subscriptionId);
  if (!live.ok) {
    skipped += 1;
    console.log(`- ${profile.id} sub=${subscriptionId}: SKIPPED (Lemon Squeezy HTTP ${live.httpStatus}); nothing written`);
    continue;
  }

  const state = profileStateFor(live);
  const next = {
    ...state,
    subscription_renews_at: live.renewsAt,
    subscription_ends_at: live.endsAt,
  };
  const before = {
    plan: profile.plan,
    subscription_status: profile.subscription_status,
    subscription_renews_at: profile.subscription_renews_at,
    subscription_ends_at: profile.subscription_ends_at,
  };
  const same = (x, y) =>
    x === y || (x && y && new Date(x).getTime() === new Date(y).getTime());
  const differs =
    before.plan !== next.plan ||
    before.subscription_status !== next.subscription_status ||
    !same(before.subscription_renews_at, next.subscription_renews_at) ||
    !same(before.subscription_ends_at, next.subscription_ends_at);

  console.log(`- ${profile.id} sub=${subscriptionId} (LS status: ${live.status})`);
  console.log("    before:", JSON.stringify(before));
  console.log("    after :", JSON.stringify(next));

  if (!differs) {
    console.log("    already in sync");
    continue;
  }
  changed += 1;
  if (!apply) continue;

  const now = new Date().toISOString();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ ...next, updated_at: now })
    .eq("id", profile.id)
    .eq("lemonsqueezy_subscription_id", subscriptionId);
  if (profileError) {
    console.error("    profile update FAILED:", profileError);
    continue;
  }

  const historyStatus = live.status === "on_trial" ? "active" : live.status ?? "inactive";
  const { error: historyError } = await supabase
    .from("subscription_history")
    .update({ status: historyStatus, renews_at: live.renewsAt, ends_at: live.endsAt, updated_at: now })
    .eq("user_id", profile.id)
    .eq("lemonsqueezy_subscription_id", subscriptionId);
  if (historyError) console.error("    history update FAILED:", historyError);
  else console.log("    written");
}

console.log(`\nDone. ${changed} needed changes${apply ? " (applied)" : " (dry run, nothing written)"}, ${skipped} skipped.`);
