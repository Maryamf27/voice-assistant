import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolvePremiumPackageId, verifyLemonSqueezyWebhook } from "@/lib/payment-provider";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

type LemonSqueezyEvent = {
  meta?: {
    event_name?: string;
    custom_data?: { user_id?: string; package_id?: string };
  };
  data?: {
    id?: string;
    attributes?: {
      status?: string;
      customer_id?: number;
      ends_at?: string | null;
      user_email?: string | null;
      user_name?: string | null;
      variant_id?: number | string | null;
    };
    relationships?: {
      variant?: { data?: { id?: string | null } };
    };
  };
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role is not configured.");
  return createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("x-signature");
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!signature || !secret || !verifyLemonSqueezyWebhook(payload, signature, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event: LemonSqueezyEvent;
  try {
    event = JSON.parse(payload) as LemonSqueezyEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const eventId = event.data?.id;
  const eventName = event.meta?.event_name;
  const userId = event.meta?.custom_data?.user_id;
  if (!eventId || !eventName) return NextResponse.json({ error: "Missing event details." }, { status: 400 });

  const supabase = getAdminClient();
  const attributes = event.data?.attributes;
  const status = attributes?.status;
  const endsAt = attributes?.ends_at ? new Date(attributes.ends_at) : null;
  let resolvedUserId = userId;

  if (!resolvedUserId && attributes?.user_email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", attributes.user_email)
      .maybeSingle();
    resolvedUserId = profile?.id;
  }

  const accessContinues = endsAt !== null && endsAt.getTime() > Date.now();
  const grantsAccess = status === "active" || new Set(["subscription_created", "subscription_updated", "subscription_resumed", "subscription_unpaused", "subscription_payment_success"]).has(eventName);
  const revokesAccess = new Set(["subscription_expired", "subscription_paused", "subscription_payment_failed"]).has(eventName) ||
    (eventName === "subscription_cancelled" && !accessContinues);

  const entitlementEvent = grantsAccess || revokesAccess;
  if (!entitlementEvent) return NextResponse.json({ received: true, ignored: "unhandled_event" });
  if (!resolvedUserId) {
    console.error("Lemon Squeezy webhook could not identify a Supabase user", { eventName, subscriptionId: eventId, hasCustomUserId: Boolean(userId), hasUserEmail: Boolean(attributes?.user_email) });
    return NextResponse.json({ error: "Webhook user could not be identified." }, { status: 422 });
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[v0] Lemon Squeezy entitlement event", {
      eventName,
      subscriptionId: event.data?.id,
      userId: resolvedUserId,
      plan: grantsAccess ? "premium" : revokesAccess ? "free" : "unchanged",
      subscriptionStatus: grantsAccess ? "active" : revokesAccess ? "inactive" : "unchanged",
    });
  }

  if (resolvedUserId && entitlementEvent) {
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("lemonsqueezy_subscription_id")
      .eq("id", resolvedUserId)
      .maybeSingle();
    const currentSubscriptionId = currentProfile?.lemonsqueezy_subscription_id;
    if (revokesAccess && currentSubscriptionId && currentSubscriptionId !== event.data?.id) {
      return NextResponse.json({ received: true, ignored: "stale_subscription_event" });
    }

    const variantId = event.data?.attributes?.variant_id != null
      ? String(event.data.attributes.variant_id)
      : event.data?.relationships?.variant?.data?.id ?? null;
    const packageId = resolvePremiumPackageId({
      variantId,
      packageId: event.meta?.custom_data?.package_id,
    });

    const update = grantsAccess
      ? {
          plan: "premium" as const,
          subscription_status: "active" as const,
          lemonsqueezy_subscription_id: event.data?.id ?? null,
          lemonsqueezy_customer_id: attributes?.customer_id ? String(attributes.customer_id) : null,
          lemonsqueezy_variant_id: variantId,
          premium_package_id: packageId,
          subscription_ends_at: attributes?.ends_at ?? null,
        }
      : {
          plan: "free" as const,
          subscription_status: "inactive" as const,
          lemonsqueezy_variant_id: null,
          premium_package_id: null,
          subscription_ends_at: attributes?.ends_at ?? null,
        };
    const { error } = await supabase.from("profiles").update(update).eq("id", resolvedUserId);
    if (error) {
      console.error("Could not synchronize Premium entitlement", error);
      return NextResponse.json({ error: "Entitlement update failed." }, { status: 500 });
    }
  }

  const { error: eventError } = await supabase.from("payment_webhook_events").insert({
    provider: "lemonsqueezy",
    event_id: `${eventName}:${eventId}`,
  });
  if (eventError && eventError.code !== "23505") {
    console.error("Could not record processed payment webhook", eventError);
    return NextResponse.json({ error: "Webhook could not be recorded." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
