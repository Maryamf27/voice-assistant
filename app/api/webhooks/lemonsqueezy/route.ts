import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  resolvePremiumPackageId,
  verifyLemonSqueezyWebhook,
  getPremiumPackage,
} from "@/lib/payment-provider";
import type { Database, Plan, PremiumPackageId } from "@/lib/supabase/types";

export const runtime = "nodejs";

type LemonSqueezyEvent = {
  meta?: {
    event_name?: string;
    custom_data?: {
      user_id?: string;
      package_id?: string;
    };
  };

  data?: {
    id?: string;

    attributes?: {
      status?: string;
      customer_id?: number;
      subscription_id?: number | string | null;
      ends_at?: string | null;
      user_email?: string | null;
      user_name?: string | null;
      variant_id?: number | string | null;
      renews_at?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
      card_brand?: string | null;
      currency?: string | null;
      order_id?: number | null;
    };

    relationships?: {
      variant?: {
        data?: {
          id?: string | null;
        };
      };
    };
  };
};

const SUBSCRIPTION_RESOURCE_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_resumed",
  "subscription_unpaused",
  "subscription_cancelled",
  "subscription_paused",
  "subscription_expired",
]);

const INVOICE_EVENTS = new Set([
  "subscription_payment_success",
  "subscription_payment_failed",
  "subscription_payment_recovered",
  "subscription_payment_refunded",
]);

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase service role is not configured.");
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeStatus(
  eventName: string,
  payloadStatus: string | undefined,
): string {
  switch (eventName) {
    case "subscription_cancelled":
      return "cancelled";

    case "subscription_expired":
      return "expired";

    case "subscription_paused":
      return "paused";

    case "subscription_resumed":
    case "subscription_unpaused":
    case "subscription_created":
      return "active";

    case "subscription_updated":
      return payloadStatus ?? "inactive";

    case "subscription_payment_success":
      return "active";

    case "subscription_payment_failed":
      return payloadStatus ?? "inactive";

    default:
      return payloadStatus ?? "inactive";
  }
}

export async function POST(request: Request) {
  const payload = await request.text();

  const signature = request.headers.get("x-signature");
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (
    !signature ||
    !secret ||
    !verifyLemonSqueezyWebhook(payload, signature, secret)
  ) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  let event: LemonSqueezyEvent;

  try {
    event = JSON.parse(payload) as LemonSqueezyEvent;
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook payload." },
      { status: 400 },
    );
  }

  const eventName = event.meta?.event_name;

  if (!eventName || !event.data?.id) {
    return NextResponse.json(
      { error: "Missing event details." },
      { status: 400 },
    );
  }

  const supabase = getAdminClient();

  const attributes = event.data.attributes;

  const isSubscriptionResourceEvent =
    SUBSCRIPTION_RESOURCE_EVENTS.has(eventName);

  const isInvoiceEvent = INVOICE_EVENTS.has(eventName);

  const subscriptionId =
    isInvoiceEvent && attributes?.subscription_id != null
      ? String(attributes.subscription_id)
      : isSubscriptionResourceEvent
        ? event.data.id
        : attributes?.subscription_id != null
          ? String(attributes.subscription_id)
          : event.data.id;

  const status = attributes?.status;

  const endsAt = attributes?.ends_at
    ? new Date(attributes.ends_at)
    : null;

  let resolvedUserId = event.meta?.custom_data?.user_id;


  if (!resolvedUserId && attributes?.user_email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", attributes.user_email)
      .maybeSingle();

    resolvedUserId = profile?.id;
  }

  const accessContinues =
    endsAt !== null && endsAt.getTime() > Date.now();

  const grantsAccess =
    status === "active" ||
    new Set([
      "subscription_created",
      "subscription_resumed",
      "subscription_unpaused",
      "subscription_payment_success",
    ]).has(eventName);

  const revokesAccess =
    new Set([
      "subscription_expired",
      "subscription_paused",
      "subscription_payment_failed",
    ]).has(eventName) ||
    (eventName === "subscription_cancelled" && !accessContinues);

  const entitlementEvent = grantsAccess || revokesAccess;

  if (!entitlementEvent && !isSubscriptionResourceEvent) {
    return NextResponse.json({
      received: true,
      ignored: "unhandled_event",
    });
  }

  if (!resolvedUserId) {
    console.error(
      "Lemon Squeezy webhook could not identify a Supabase user",
      {
        eventName,
        subscriptionId,
        hasCustomUserId: Boolean(event.meta?.custom_data?.user_id),
        hasUserEmail: Boolean(attributes?.user_email),
      },
    );

    return NextResponse.json(
      { error: "Webhook user could not be identified." },
      { status: 422 },
    );
  }

  const { data: currentProfile, error: profileReadError } = await supabase
    .from("profiles")
    .select(
      "lemonsqueezy_subscription_id, lemonsqueezy_customer_id, lemonsqueezy_variant_id, subscription_interval, subscription_ends_at",
    )
    .eq("id", resolvedUserId)
    .maybeSingle();

  if (profileReadError) {
    console.error(
      "Could not read current subscription profile",
      profileReadError,
    );

    return NextResponse.json(
      { error: "Could not read subscription profile." },
      { status: 500 },
    );
  }

  const currentSubscriptionId =
    currentProfile?.lemonsqueezy_subscription_id ?? null;

  const isStaleRevocation =
    Boolean(
      revokesAccess &&
        currentSubscriptionId &&
        currentSubscriptionId !== subscriptionId,
    );

  const payloadVariantId =
    attributes?.variant_id != null
      ? String(attributes.variant_id)
      : event.data?.relationships?.variant?.data?.id ?? null;

  const variantId =
    payloadVariantId ??
    currentProfile?.lemonsqueezy_variant_id ??
    null;


  const resolvedPackageId = resolvePremiumPackageId({
    variantId: payloadVariantId,
    packageId: event.meta?.custom_data?.package_id,
  });

  const packageId: PremiumPackageId | null =
    (resolvedPackageId ??
      (currentProfile?.subscription_interval === "monthly" ||
      currentProfile?.subscription_interval === "yearly"
        ? currentProfile.subscription_interval
        : null)) as PremiumPackageId | null;

  const subscriptionEndsAt =
    attributes?.ends_at !== undefined
      ? attributes.ends_at
      : currentProfile?.subscription_ends_at ?? null;

  const customerId =
    attributes?.customer_id != null
      ? String(attributes.customer_id)
      : currentProfile?.lemonsqueezy_customer_id ?? null;

  if (entitlementEvent && !isStaleRevocation) {
    const update = grantsAccess
      ? {
          plan: "premium" as Plan,
          subscription_status: "active" as const,

          lemonsqueezy_subscription_id: subscriptionId,

          lemonsqueezy_customer_id: customerId,

          lemonsqueezy_variant_id: variantId,

          subscription_interval: packageId,

          subscription_ends_at: subscriptionEndsAt,
        }
      : {
          plan: "free" as Plan,
          subscription_status: "inactive" as const,

          lemonsqueezy_subscription_id: subscriptionId,

          lemonsqueezy_customer_id: customerId,

          lemonsqueezy_variant_id: null,

          subscription_interval: null,

          subscription_ends_at: subscriptionEndsAt,
        };

    const { error: updateError } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", resolvedUserId);

    if (updateError) {
      console.error(
        "Could not synchronize Premium entitlement",
        updateError,
      );

      return NextResponse.json(
        { error: "Entitlement update failed." },
        { status: 500 },
      );
    }
  }

  if (isSubscriptionResourceEvent) {
    const resolvedStatus = normalizeStatus(
      eventName,
      status,
    );

    const matchedPackage = variantId
      ? getPremiumPackage(String(variantId))
      : null;

    const price =
      matchedPackage?.priceAmount ?? null;

    const currency =
      matchedPackage?.currency ??
      attributes?.currency ??
      null;

    const renewsAt =
      attributes?.renews_at ?? null;

    const startedAt =
      attributes?.created_at ??
      null;

    const historyRecord = {
      user_id: resolvedUserId,

      lemonsqueezy_subscription_id: subscriptionId,

      lemonsqueezy_customer_id: customerId,

      lemonsqueezy_variant_id: variantId,

      subscription_interval: packageId,

      plan: "premium",

      status: resolvedStatus,

      price,

      currency,

      started_at: startedAt,

      renews_at: renewsAt,

      ends_at: subscriptionEndsAt,

      updated_at: new Date().toISOString(),
    } as const;

    const { error: historyError } = await supabase
      .from("subscription_history")
      .upsert(historyRecord, {
        onConflict:
          "user_id,lemonsqueezy_subscription_id",
        ignoreDuplicates: false,
      });

    if (historyError) {
      console.error(
        "Could not synchronize subscription history",
        historyError,
      );

      return NextResponse.json(
        { error: "Subscription history update failed." },
        { status: 500 },
      );
    }
  }

  const { error: eventError } = await supabase
    .from("payment_webhook_events")
    .insert({
      provider: "lemonsqueezy",
      event_id: `${eventName}:${event.data.id}`,
    });

  if (eventError && eventError.code !== "23505") {
    console.error(
      "Could not record processed payment webhook",
      eventError,
    );

    return NextResponse.json(
      { error: "Webhook could not be recorded." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    received: true,

    ...(isStaleRevocation
      ? {
          history_updated: true,
          ignored_profile_update: "stale_subscription_event",
        }
      : {}),
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed." },
    { status: 405 },
  );
}