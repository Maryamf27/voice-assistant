import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  resolvePremiumPackageId,
  verifyLemonSqueezyWebhook,
} from "@/lib/payment-provider";
import type { Database } from "@/lib/supabase/types";

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

  /*
   * Lemon Squeezy has different resource types.
   *
   * Subscription events:
   *   data.id = subscription ID
   *
   * Invoice/payment events:
   *   data.id = invoice ID
   *   attributes.subscription_id = subscription ID
   */
  const subscriptionId =
    attributes?.subscription_id != null
      ? String(attributes.subscription_id)
      : event.data.id;

  const status = attributes?.status;

  const endsAt = attributes?.ends_at
    ? new Date(attributes.ends_at)
    : null;

  let resolvedUserId = event.meta?.custom_data?.user_id;

  /*
   * Fallback: identify user by email.
   */
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
      "subscription_updated",
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

  if (!entitlementEvent) {
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

  /*
   * Get the current subscription information.
   *
   * This is important because payment/invoice events may not contain
   * variant_id or ends_at.
   */
  const { data: currentProfile, error: profileReadError } = await supabase
    .from("profiles")
    .select(
      "lemonsqueezy_subscription_id, lemonsqueezy_variant_id, subscription_interval, subscription_ends_at",
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

  /*
   * Ignore cancellation/expiration events belonging to an old
   * subscription.
   */
  if (
    revokesAccess &&
    currentSubscriptionId &&
    currentSubscriptionId !== subscriptionId
  ) {
    return NextResponse.json({
      received: true,
      ignored: "stale_subscription_event",
    });
  }

  /*
   * Get variant ID from the current webhook payload.
   *
   * Some events provide attributes.variant_id.
   * Others provide relationships.variant.data.id.
   */
  const payloadVariantId =
    attributes?.variant_id != null
      ? String(attributes.variant_id)
      : event.data?.relationships?.variant?.data?.id ?? null;

  /*
   * Keep the existing variant if this particular event doesn't
   * contain one.
   */
  const variantId =
    payloadVariantId ??
    currentProfile?.lemonsqueezy_variant_id ??
    null;

  /*
   * Resolve monthly/yearly.
   *
   * If the current event doesn't contain enough information,
   * preserve the value already stored in Supabase.
   */
  const resolvedPackageId = resolvePremiumPackageId({
    variantId: payloadVariantId,
    packageId: event.meta?.custom_data?.package_id,
  });

  const packageId =
    resolvedPackageId ??
    currentProfile?.subscription_interval ??
    null;

  /*
   * Don't erase subscription_ends_at when an event doesn't
   * provide ends_at.
   */
  const subscriptionEndsAt =
    attributes?.ends_at !== undefined
      ? attributes.ends_at
      : currentProfile?.subscription_ends_at ?? null;

  const update = grantsAccess
    ? {
        plan: "premium" as const,
        subscription_status: "active" as const,

        lemonsqueezy_subscription_id: subscriptionId,

        lemonsqueezy_customer_id:
          attributes?.customer_id != null
            ? String(attributes.customer_id)
            : null,

        lemonsqueezy_variant_id: variantId,

        subscription_interval: packageId,

        subscription_ends_at: subscriptionEndsAt,
      }
    : {
        plan: "free" as const,
        subscription_status: "inactive" as const,

        lemonsqueezy_subscription_id: subscriptionId,

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

  /*
   * Record webhook event.
   */
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

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed." },
    { status: 405 },
  );
}