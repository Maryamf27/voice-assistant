import { NextResponse } from "next/server";
import {
  resolvePremiumPackageId,
  verifyLemonSqueezyWebhook,
  getPremiumPackage,
} from "@/lib/payment-provider";
import type { Database, PremiumPackageId } from "@/lib/supabase/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

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

type EntitlementTransition = "grant" | "cancel" | "revoke";

function resolveTransition(
  eventName: string,
  payloadStatus: string | undefined,
): EntitlementTransition | null {
  switch (eventName) {
    case "subscription_created":
    case "subscription_resumed":
    case "subscription_unpaused":
    case "subscription_payment_success":
    case "subscription_payment_recovered":
      return "grant";

    case "subscription_cancelled":
      return "cancel";

    case "subscription_expired":
    case "subscription_paused":
    case "subscription_payment_failed":
      return "revoke";

    case "subscription_updated":
      switch (payloadStatus) {
        case "active":
        case "on_trial":
          return "grant";
        case "cancelled":
          return "cancel";
        case "expired":
        case "paused":
          return "revoke";
        default:
          return null;
      }

    default:
      return null;
  }
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

  const supabase = createSupabaseAdminClient();

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

  let resolvedUserId = event.meta?.custom_data?.user_id;


  if (!resolvedUserId && attributes?.user_email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", attributes.user_email)
      .maybeSingle();

    resolvedUserId = profile?.id;
  }

  const transition = resolveTransition(eventName, status);

  if (!transition && !isSubscriptionResourceEvent) {
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
      "plan, subscription_status, lemonsqueezy_subscription_id, lemonsqueezy_customer_id, lemonsqueezy_variant_id, subscription_interval, subscription_ends_at, subscription_renews_at",
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

  const isStaleSubscriptionEvent = Boolean(
    currentSubscriptionId && currentSubscriptionId !== subscriptionId,
  );

  const sameSubscriptionProfile = isStaleSubscriptionEvent
    ? null
    : currentProfile;

  const payloadVariantId =
    attributes?.variant_id != null
      ? String(attributes.variant_id)
      : event.data?.relationships?.variant?.data?.id ?? null;

  const variantId =
    payloadVariantId ??
    sameSubscriptionProfile?.lemonsqueezy_variant_id ??
    null;

  const resolvedPackageId = resolvePremiumPackageId({
    variantId: payloadVariantId,
    packageId: event.meta?.custom_data?.package_id,
  });

  const fallbackInterval = sameSubscriptionProfile?.subscription_interval;
  const packageId: PremiumPackageId | null =
    resolvedPackageId ??
    (fallbackInterval === "monthly" || fallbackInterval === "yearly"
      ? fallbackInterval
      : null);

  const subscriptionEndsAt =
    attributes?.ends_at !== undefined
      ? attributes.ends_at
      : sameSubscriptionProfile?.subscription_ends_at ?? null;

  const subscriptionRenewsAt =
    attributes?.renews_at ??
    sameSubscriptionProfile?.subscription_renews_at ??
    null;

  const customerId =
    attributes?.customer_id != null
      ? String(attributes.customer_id)
      : sameSubscriptionProfile?.lemonsqueezy_customer_id ?? null;
  const cancelAccessContinues =
    subscriptionEndsAt !== null &&
    new Date(subscriptionEndsAt).getTime() > Date.now();

  const effectiveTransition: EntitlementTransition | null =
    transition === "cancel" && !cancelAccessContinues ? "revoke" : transition;

  const isStaleRevocation =
    isStaleSubscriptionEvent &&
    (effectiveTransition === "cancel" || effectiveTransition === "revoke");

  const isLateInvoiceForCancelled =
    isInvoiceEvent &&
    effectiveTransition === "grant" &&
    !isStaleSubscriptionEvent &&
    currentProfile?.subscription_status === "cancelled";

  const skipProfileUpdate = isStaleRevocation || isLateInvoiceForCancelled;

  if (effectiveTransition && !skipProfileUpdate) {
    const subscriptionFields: ProfileUpdate = {
      lemonsqueezy_subscription_id: subscriptionId,
      lemonsqueezy_customer_id: customerId,
      lemonsqueezy_variant_id: variantId,
      subscription_interval: packageId,
      subscription_ends_at: subscriptionEndsAt,
      subscription_renews_at: subscriptionRenewsAt,
    };

    const update: ProfileUpdate =
      effectiveTransition === "grant"
        ? {
          plan: "premium",
          subscription_status: "active",
          ...subscriptionFields,
        }
        : effectiveTransition === "cancel"
          ? {
            plan: "premium",
            subscription_status: "cancelled",
            ...subscriptionFields,
          }
          : {
            plan: "free",
            subscription_status: "inactive",
            ...subscriptionFields,
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
    const matchedPackage = packageId ? getPremiumPackage(packageId) : null;

    const price =
      matchedPackage?.priceAmount ?? null;

    const currency =
      matchedPackage?.currency ??
      attributes?.currency ??
      null;

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

      ...(startedAt ? { started_at: startedAt } : {}),

      renews_at: subscriptionRenewsAt,

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

    ...(skipProfileUpdate
      ? {
        history_updated: isSubscriptionResourceEvent,
        ignored_profile_update: isStaleRevocation
          ? "stale_subscription_event"
          : "subscription_already_cancelled",
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
