import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserSubscription } from "@/lib/entitlements";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const subscription = await getUserSubscription(user.id);
  if (!subscription?.subscriptionId) {
    return NextResponse.json({ error: "No active subscription found." }, { status: 404 });
  }

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });

  const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subscription.subscriptionId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "subscriptions",
        id: subscription.subscriptionId,
        attributes: { cancelled: true },
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Subscription cancellation failed", await response.text());
    return NextResponse.json({ error: "Unable to cancel subscription." }, { status: 502 });
  }

  return NextResponse.json({ cancelled: true });
}
