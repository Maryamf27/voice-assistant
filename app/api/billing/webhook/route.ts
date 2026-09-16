import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyStripeWebhook } from "@/lib/payment-provider";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

type StripeEvent = {
  id?: string;
  type?: string;
  data?: { object?: { payment_status?: string; customer_details?: { email?: string }; metadata?: Record<string, string>; subscription?: string } };
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role is not configured.");
  return createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret || !verifyStripeWebhook(payload, signature, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  if (!event.id) return NextResponse.json({ error: "Missing event id." }, { status: 400 });
  const supabase = getAdminClient();
  const { error: eventError } = await supabase.from("payment_webhook_events").insert({ provider: "stripe", event_id: event.id });
  if (eventError?.code === "23505") return NextResponse.json({ received: true });
  if (eventError) {
    console.error("Could not record payment webhook", eventError);
    return NextResponse.json({ error: "Webhook could not be recorded." }, { status: 500 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data?.object;
    if (session?.payment_status === "paid") {
      const userId = session.metadata?.user_id;
      if (userId) {
        const { error } = await supabase
          .from("profiles")
          .update({ plan: "premium", subscription_status: "active" })
          .eq("id", userId);
        if (error) {
          console.error("Could not activate Premium entitlement", error);
          return NextResponse.json({ error: "Entitlement update failed." }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
