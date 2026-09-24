import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserSubscription } from "@/lib/entitlements";
import { cancelSubscriptionAtPeriodEnd } from "@/lib/payment-provider";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const subscription = await getUserSubscription(user.id);
  if (!subscription?.subscriptionId) {
    return NextResponse.json({ error: "No active subscription found." }, { status: 404 });
  }

  try {
    await cancelSubscriptionAtPeriodEnd(subscription.subscriptionId);
  } catch (error) {
    console.error("Subscription cancellation failed", error);
    return NextResponse.json({ error: "Unable to cancel subscription." }, { status: 502 });
  }

  return NextResponse.json({ cancelled: true });
}
