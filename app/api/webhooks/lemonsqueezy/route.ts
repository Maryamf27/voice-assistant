import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyLemonSqueezyWebhook } from "@/lib/payment-provider";
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
  const { error: eventError } = await supabase.from("payment_webhook_events").insert({
    provider: "lemonsqueezy",
    event_id: `${eventName}:${eventId}`,
  });
  if (eventError?.code === "23505") return NextResponse.json({ received: true });
  if (eventError) {
    console.error("Could not record payment webhook", eventError);
    return NextResponse.json({ error: "Webhook could not be recorded." }, { status: 500 });
  }

  const activeEvents = new Set(["subscription_created", "subscription_updated", "subscription_resumed", "subscription_payment_success"]);
  const inactiveEvents = new Set(["subscription_cancelled", "subscription_expired", "subscription_paused"]);
  if (userId && activeEvents.has(eventName) && event.data?.attributes?.status === "active") {
    const attributes = event.data.attributes;
    const { error } = await supabase.from("profiles").update({
      plan: "premium",
      subscription_status: "active",
      lemonsqueezy_subscription_id: event.data.id,
      lemonsqueezy_customer_id: attributes.customer_id ? String(attributes.customer_id) : null,
      subscription_ends_at: attributes.ends_at ?? null,
    }).eq("id", userId);
    if (error) {
      console.error("Could not activate Premium entitlement", error);
      return NextResponse.json({ error: "Entitlement update failed." }, { status: 500 });
    }
  } else if (userId && inactiveEvents.has(eventName)) {
    const { error } = await supabase.from("profiles").update({
      plan: "free",
      subscription_status: "inactive",
      subscription_ends_at: event.data?.attributes?.ends_at ?? null,
    }).eq("id", userId);
    if (error) {
      console.error("Could not downgrade entitlement", error);
      return NextResponse.json({ error: "Entitlement update failed." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
