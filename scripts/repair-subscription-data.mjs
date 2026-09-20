import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LEMON_SQUEEZY_API_KEY",
  "LEMON_SQUEEZY_STORE_ID",
  "LEMON_SQUEEZY_MONTHLY_VARIANT_ID",
  "LEMON_SQUEEZY_YEARLY_VARIANT_ID",
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LS_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
const LS_STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID;
const MONTHLY_VARIANT = process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID;
const YEARLY_VARIANT = process.env.LEMON_SQUEEZY_YEARLY_VARIANT_ID;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

const lsHeaders = {
  Authorization: `Bearer ${LS_API_KEY}`,
  Accept: "application/vnd.api+json",
  "Content-Type": "application/vnd.api+json",
};

const report = {};

function variantToInterval(variantId) {
  if (variantId == null) return null;
  const s = String(variantId);
  if (s === String(MONTHLY_VARIANT)) return "monthly";
  if (s === String(YEARLY_VARIANT)) return "yearly";
  return null;
}

function intervalFromBillingCycle(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  if (s.startsWith("month")) return "monthly";
  if (s.startsWith("year") || s.startsWith("annual")) return "yearly";
  return null;
}

function normalizeStatus(raw) {
  if (!raw) return "inactive";
  const s = String(raw).toLowerCase();
  switch (s) {
    case "active":
    case "on_trial":
      return "active";
    case "cancelled":
    case "past_due":
    case "unpaid":
      return s === "past_due" || s === "unpaid" ? "inactive" : "cancelled";
    case "expired":
      return "expired";
    case "paused":
      return "paused";
    default:
      return "inactive";
  }
}

function pickPriceAndCurrency(attrs, variant, interval) {
  const probes = [
    attrs?.first_subscription_item?.price,
    attrs?.first_order_subtotal,
    attrs?.price,
    attrs?.current_price,
  ];
  for (const priceObj of probes) {
    if (!priceObj || typeof priceObj !== "object") continue;
    const price =
      typeof priceObj.unit_price === "number"
        ? priceObj.unit_price / 100
        : typeof priceObj.unit_price_decimal === "string"
        ? Number(priceObj.unit_price_decimal) / 100
        : null;
    const currency =
      typeof priceObj.currency === "string"
        ? priceObj.currency.toUpperCase()
        : typeof priceObj.unit === "string"
        ? priceObj.unit.toUpperCase()
        : null;
    if (price != null && !Number.isNaN(price) && currency) {
      return { price, currency };
    }
  }
  const usdCent =
    typeof attrs?.first_order_subtotal_usd === "number"
      ? attrs.first_order_subtotal_usd / 100
      : typeof attrs?.usd === "number"
      ? attrs.usd / 100
      : typeof attrs?.first_subscription_item?.price?.unit_price === "number"
      ? attrs.first_subscription_item.price.unit_price / 100
      : null;
  if (usdCent != null && !Number.isNaN(usdCent)) {
    return { price: usdCent, currency: "USD" };
  }
  const vId = String(variant ?? "");
  const variantMapPrice =
    vId === String(MONTHLY_VARIANT) ? 799 : vId === String(YEARLY_VARIANT) ? 7999 : null;
  if (variantMapPrice != null) {
    return { price: variantMapPrice, currency: "PKR" };
  }
  return { price: null, currency: null };
}

async function tryFetchLsSubscription(id) {
  if (!id) return { ok: false, notFound: false, data: null, httpStatus: null };
  try {
    const url = `https://api.lemonsqueezy.com/v1/subscriptions/${encodeURIComponent(id)}`;
    const res = await fetch(url, { headers: lsHeaders, cache: "no-store" });
    if (res.status === 404) {
      return { ok: false, notFound: true, data: null, httpStatus: 404 };
    }
    if (!res.ok) {
      return { ok: false, notFound: false, data: null, httpStatus: res.status };
    }
    const json = await res.json();
    return { ok: true, notFound: false, data: json, httpStatus: 200 };
  } catch (err) {
    return { ok: false, notFound: false, data: null, httpStatus: "network", err };
  }
}

async function listLsSubscriptions({ customerEmail, status }) {
  const out = [];
  let page = 1;
  const perPage = 100;
  let hasMore = true;
  while (hasMore) {
    const params = new URLSearchParams({
      "filter[store_id]": LS_STORE_ID,
      "page[number]": String(page),
      "page[size]": String(perPage),
    });
    if (status) params.set("filter[status]", status);
    const url = `https://api.lemonsqueezy.com/v1/subscriptions?${params.toString()}`;
    const res = await fetch(url, { headers: lsHeaders, cache: "no-store" });
    if (!res.ok) {
      console.error(`[LS list] HTTP ${res.status}`);
      break;
    }
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    for (const sub of list) {
      const email =
        sub?.attributes?.user_email ??
        sub?.attributes?.customer_email ??
        sub?.attributes?.email ??
        null;
      if (customerEmail && email && email.toLowerCase() === customerEmail.toLowerCase()) {
        out.push(sub);
      }
    }
    const totalPages = Number(json?.meta?.page?.last_page ?? 0);
    if (page >= totalPages || list.length === 0) {
      hasMore = false;
    } else {
      page += 1;
    }
  }
  return out;
}

async function extractSubscriptionShape(lsSub) {
  const id = lsSub?.id;
  const attrs = lsSub?.attributes ?? {};
  const variantId =
    attrs.variant_id != null
      ? String(attrs.variant_id)
      : lsSub?.relationships?.variant?.data?.id != null
      ? String(lsSub.relationships.variant.data.id)
      : attrs.first_subscription_item?.variant_id != null
      ? String(attrs.first_subscription_item.variant_id)
      : null;
  console.log(`  [price-debug] ls sub=${id} variantId=${variantId} MONTHLY_VAR=${MONTHLY_VARIANT} YEARLY_VAR=${YEARLY_VARIANT} monthly match=${variantId === MONTHLY_VARIANT} yearly match=${variantId === YEARLY_VARIANT}`);
  const customerId =
    lsSub?.relationships?.customer?.data?.id ?? attrs.customer_id ?? null;
  const rawInterval =
    attrs.billing_anchor ?? attrs.first_subscription_item?.billing_cycle ?? null;
  let interval = intervalFromBillingCycle(
    attrs.first_subscription_item?.billing_cycle
  );
  if (!interval) interval = variantToInterval(variantId);
  const rawStatus = attrs.status || attrs.status_formatted;
  const status = normalizeStatus(rawStatus);
  const startedAt =
    attrs.created_at || attrs.createdAt || attrs.trial_ends_at || null;
  const renewsAt = attrs.renews_at || attrs.next_payment_date || null;
  const endsAt = attrs.ends_at || attrs.cancel_url ? attrs.ends_at : null;
  const { price, currency } = pickPriceAndCurrency(attrs, variantId, interval);
  return {
    id: id ? String(id) : null,
    customerId: customerId ? String(customerId) : null,
    variantId: variantId ? String(variantId) : null,
    interval,
    status,
    rawStatus: String(rawStatus ?? ""),
    startedAt,
    renewsAt,
    endsAt,
    price,
    currency,
    email:
      attrs.user_email ?? attrs.customer_email ?? attrs.email ?? null,
    plan: status === "active" || status === "cancelled" || status === "paused"
      ? "premium"
      : "free",
  };
}

async function main() {
  console.log("\n========== STEP 1: Load premium profiles from Supabase ==========\n");
  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("plan", "premium");
  if (profilesErr) {
    console.error("Failed to load profiles:", profilesErr);
    process.exit(2);
  }
  console.log(`Found ${profiles.length} profile(s) with plan=premium.`);

  const targetProfiles = profiles.length > 0 ? profiles : [];
  if (profiles.length === 0) {
    const { data: all } = await supabase.from("profiles").select("*").limit(10);
    console.log("No premium profiles. All profiles (top 10):", (all || []).map(p => ({ id: p.id, email: p.email, plan: p.plan })));
  }

  report.profiles = [];

  for (const profile of targetProfiles) {
    const profileReport = {
      userId: profile.id,
      email: profile.email,
      existing: {
        plan: profile.plan,
        subscription_status: profile.subscription_status,
        ls_subscription_id: profile.lemonsqueezy_subscription_id,
        ls_customer_id: profile.lemonsqueezy_customer_id,
        ls_variant_id: profile.lemonsqueezy_variant_id,
        subscription_interval: profile.subscription_interval,
        subscription_ends_at: profile.subscription_ends_at,
        created_at: profile.created_at,
      },
    };

    console.log(`\n--- Profile ${profile.id} (${profile.email}) ---`);
    console.log("Current profiles row:");
    console.log(JSON.stringify(profileReport.existing, null, 2));

    const oldLsId = profile.lemonsqueezy_subscription_id;
    const natureOfOldId = { value: oldLsId ?? null, type: null, httpStatus: null };
    profileReport.oldSubscriptionId = natureOfOldId;

    if (oldLsId) {
      console.log(`\n[LS GET /subscriptions/${oldLsId}] probing to classify 8489714...`);
      const probe = await tryFetchLsSubscription(oldLsId);
      natureOfOldId.httpStatus = probe.httpStatus;
      if (probe.ok && probe.data?.data?.id) {
        natureOfOldId.type = "real_subscription_id";
        console.log(`  -> REAL subscription resource at LS (HTTP ${probe.httpStatus}).`);
      } else if (probe.notFound) {
        natureOfOldId.type = "not_a_subscription_resource";
        console.log(`  -> 404: value ${oldLsId} is NOT a subscription resource. Likely an invoice/order ID.`);
      } else {
        natureOfOldId.type = `undetermined_http_${probe.httpStatus}`;
        console.log(`  -> HTTP ${probe.httpStatus}: cannot classify.`);
      }
    }

    console.log("\n[LS LIST /subscriptions] listing active+cancelled subscriptions for store, filtering by profile email...");
    const active = await listLsSubscriptions({ customerEmail: profile.email, status: "active" });
    const cancelled = await listLsSubscriptions({ customerEmail: profile.email, status: "cancelled" });
    const allMatches = [...active, ...cancelled];
    console.log(`  Matched ${active.length} active + ${cancelled.length} cancelled subscriptions for email ${profile.email}.`);

    allMatches.sort((a, b) => {
      const aCreated = new Date(a.attributes.created_at || 0).getTime();
      const bCreated = new Date(b.attributes.created_at || 0).getTime();
      return bCreated - aCreated;
    });
    console.log(`[LS RAW PAYLOAD (newest match)] attributes keys:`, Object.keys(allMatches[0]?.attributes ?? {}));
    console.log(`[LS RAW PAYLOAD (newest match)] first_subscription_item:`, JSON.stringify(allMatches[0]?.attributes?.first_subscription_item ?? null, null, 2));
    console.log(`[LS RAW PAYLOAD (newest match)] renews/ends/created:`, {
      renews_at: allMatches[0]?.attributes?.renews_at,
      ends_at: allMatches[0]?.attributes?.ends_at,
      created_at: allMatches[0]?.attributes?.created_at,
      next_payment_date: allMatches[0]?.attributes?.next_payment_date,
      status: allMatches[0]?.attributes?.status,
      status_formatted: allMatches[0]?.attributes?.status_formatted,
      billing_cycle_anchor: allMatches[0]?.attributes?.billing_cycle_anchor,
    });

    profileReport.allLsMatches = allMatches.map((m) => ({
      id: m.id,
      variantId: m?.relationships?.variant?.data?.id ?? null,
      status: m?.attributes?.status ?? null,
      created_at: m?.attributes?.created_at ?? null,
    }));

    let chosen = null;
    if (allMatches.length === 0) {
      console.log("  No subscription matches found by email. Skipping profile — nothing to sync.");
      profileReport.synced = null;
      report.profiles.push(profileReport);
      continue;
    } else {
      const actives = allMatches.filter(s => normalizeStatus(s.attributes.status) === "active");
      chosen = actives[0] ?? allMatches[0];
      if (allMatches.length > 1) {
        console.log(`  Disambiguated ${allMatches.length} matches → chose current ID=${chosen?.id} (active newest).`);
      }
    }

    const shape = await extractSubscriptionShape(chosen);
    console.log("\n[LS Resolved Subscription — exact non-secret values]:");
    console.log("  LS subscription id  :", shape.id);
    console.log("  LS customer id      :", shape.customerId);
    console.log("  LS variant id       :", shape.variantId);
    console.log("  billing interval    :", shape.interval, "   (raw:", JSON.stringify(chosen.attributes.first_subscription_item?.billing_cycle ?? chosen.attributes.billing_cycle ?? null), ")");
    console.log("  LS raw status       :", shape.rawStatus, "→ mapped profiles.status:", shape.status);
    console.log("  created_at(LS)      :", shape.startedAt);
    console.log("  renews_at           :", shape.renewsAt);
    console.log("  ends_at             :", shape.endsAt);
    console.log("  price/currency      :", shape.price, shape.currency);

    profileReport.synced = shape;
    profileReport.planAfterSync = shape.plan;
    profileReport.profilesStatusAfterSync = shape.status === "expired" || shape.status === "paused" || shape.status === "cancelled"
      ? profile.subscription_status
      : shape.status === "active" ? "active" : profile.subscription_status;

    const profilesUpdate = {
      lemonsqueezy_subscription_id: shape.id,
      lemonsqueezy_customer_id: shape.customerId,
      lemonsqueezy_variant_id: shape.variantId,
      subscription_interval: shape.interval,
      plan: shape.plan === "premium" ? "premium" : profile.plan,
      subscription_status:
        shape.status === "active" ? "active" :
        shape.status === "paused" ? profile.subscription_status :
        profile.subscription_status,
      subscription_ends_at:
        shape.endsAt ?? shape.renewsAt ?? profile.subscription_ends_at,
      updated_at: new Date().toISOString(),
    };

    console.log("\n[Supabase UPDATE profiles] SET:");
    console.log(JSON.stringify(profilesUpdate, null, 2));

    const { error: updateErr } = await supabase
      .from("profiles")
      .update(profilesUpdate)
      .eq("id", profile.id);
    if (updateErr) {
      console.error("profiles UPDATE FAILED:", updateErr);
      profileReport.supabaseProfilesWriteOk = false;
      report.profiles.push(profileReport);
      continue;
    }
    profileReport.supabaseProfilesWriteOk = true;

    const historyRow = {
      user_id: profile.id,
      lemonsqueezy_subscription_id: shape.id,
      lemonsqueezy_customer_id: shape.customerId,
      lemonsqueezy_variant_id: shape.variantId,
      subscription_interval: shape.interval,
      plan: "premium",
      status:
        shape.status === "active" ? "active" :
        shape.status === "cancelled" ? "cancelled" :
        shape.status === "expired" ? "expired" :
        shape.status === "paused" ? "paused" : "inactive",
      price: shape.price,
      currency: shape.currency,
      started_at: shape.startedAt,
      renews_at: shape.renewsAt,
      ends_at: shape.endsAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("\n[Supabase UPSERT subscription_history] with composite onConflict(user_id,lemonsqueezy_subscription_id):");
    console.log(JSON.stringify(historyRow, null, 2));

    const { data: historyData, error: historyErr } = await supabase
      .from("subscription_history")
      .upsert(historyRow, {
        onConflict: "user_id,lemonsqueezy_subscription_id",
        ignoreDuplicates: false,
      })
      .select("*")
      .single();

    if (historyErr) {
      console.error("subscription_history UPSERT (current) FAILED:", historyErr);
      profileReport.supabaseHistoryWriteOk = false;
    } else {
      console.log(
        `  -> current subscription_history row id=${historyData.id} written (upsert).`
      );
      profileReport.supabaseHistoryWriteOk = true;
      profileReport.syncedHistoryRowId = historyData.id;
    }

    console.log(`\n[Backfilling remaining ${Math.max(0, allMatches.length - 1)} historical subscription(s) into subscription_history...`);
    profileReport.backfilledHistoryIds = [];
    for (const older of allMatches) {
      if (older.id === chosen.id) continue;
      const olderShape = await extractSubscriptionShape(older);
      if (!olderShape.id) continue;
      const olderRow = {
        user_id: profile.id,
        lemonsqueezy_subscription_id: olderShape.id,
        lemonsqueezy_customer_id: olderShape.customerId,
        lemonsqueezy_variant_id: olderShape.variantId,
        subscription_interval: olderShape.interval,
        plan: "premium",
        status:
          olderShape.status === "active" ? "active" :
          olderShape.status === "cancelled" ? "cancelled" :
          olderShape.status === "expired" ? "expired" :
          olderShape.status === "paused" ? "paused" : "inactive",
        price: olderShape.price,
        currency: olderShape.currency,
        started_at: olderShape.startedAt,
        renews_at: olderShape.renewsAt,
        ends_at: olderShape.endsAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data: hd, error: herr } = await supabase
        .from("subscription_history")
        .upsert(olderRow, {
          onConflict: "user_id,lemonsqueezy_subscription_id",
          ignoreDuplicates: false,
        })
        .select("*")
        .single();
      if (herr) {
        console.error(`  backfill sub=${olderShape.id} failed:`, herr);
      } else {
        console.log(`  -> backfilled history id=${hd.id} for ls_sub=${olderShape.id} (status=${olderRow.status})`);
        profileReport.backfilledHistoryIds.push(hd.id);
      }
    }

    report.profiles.push(profileReport);
  }

  console.log("\n========== STEP 2: Verify DB contents after sync ==========\n");
  for (const p of report.profiles) {
    if (!p.userId) continue;
    const { data: refreshed, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", p.userId)
      .single();
    const { data: history } = await supabase
      .from("subscription_history")
      .select("*")
      .eq("user_id", p.userId);
    console.log(`\n[DB: profiles refreshed] user=${p.userId}`);
    console.log({
      plan: refreshed?.plan,
      subscription_status: refreshed?.subscription_status,
      ls_subscription_id: refreshed?.lemonsqueezy_subscription_id,
      ls_customer_id: refreshed?.lemonsqueezy_customer_id,
      ls_variant_id: refreshed?.lemonsqueezy_variant_id,
      subscription_interval: refreshed?.subscription_interval,
      subscription_ends_at: refreshed?.subscription_ends_at,
    });
    console.log(`[DB: subscription_history rows for user=${p.userId}]:`, history?.length ?? 0);
    for (const h of history ?? []) {
      console.log("  - history row:", {
        id: h.id,
        ls_subscription_id: h.lemonsqueezy_subscription_id,
        ls_variant_id: h.lemonsqueezy_variant_id,
        subscription_interval: h.subscription_interval,
        status: h.status,
        price: h.price,
        currency: h.currency,
        started_at: h.started_at,
        renews_at: h.renews_at,
        ends_at: h.ends_at,
      });
    }
    p.dbVerification = { profiles: refreshed, historyRows: history ?? [] };
  }

  console.log("\n========== FINAL REPORT (non-secret values only) ==========\n");
  const sanitizedReport = report.profiles.map(p => ({
    userId: p.userId,
    email: p.email,
    oldId: {
      value: p.oldSubscriptionId?.value ?? null,
      type: p.oldSubscriptionId?.type ?? null,
      httpStatus: p.oldSubscriptionId?.httpStatus ?? null,
    },
    synced: p.synced ? {
      id: p.synced.id,
      customerId: p.synced.customerId,
      variantId: p.synced.variantId,
      interval: p.synced.interval,
      status: p.synced.status,
      rawStatus: p.synced.rawStatus,
      startedAt: p.synced.startedAt,
      renewsAt: p.synced.renewsAt,
      endsAt: p.synced.endsAt,
      price: p.synced.price,
      currency: p.synced.currency,
    } : null,
    profilesWriteOk: p.supabaseProfilesWriteOk,
    historyWriteOk: p.supabaseHistoryWriteOk,
    historyRowId: p.syncedHistoryRowId ?? null,
  }));
  console.log(JSON.stringify(sanitizedReport, null, 2));
}

main().catch((err) => {
  console.error("repair script crashed:", err);
  process.exit(99);
});
