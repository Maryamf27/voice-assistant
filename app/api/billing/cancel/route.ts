import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSubscriptionAccessState, getUserSubscription } from "@/lib/entitlements";
import {
  cancelSubscriptionAtPeriodEnd,
  getSubscriptionDetails,
  type LemonSqueezySubscriptionDetails,
} from "@/lib/payment-provider";
import { formatPakistanShortDate } from "@/lib/subscription-display";
import { persistProviderCancellation } from "@/lib/subscription-sync";

function clientSubscription(details: { endsAt: string | null; renewsAt: string | null }) {
  return { status: "cancelled" as const, renewsAt: details.renewsAt, endsAt: details.endsAt };
}

function alreadyCancelledMessage(endsAt: string | null): string {
  const date = formatPakistanShortDate(endsAt);
  return date
    ? `This subscription is already cancelled. Premium access remains available until ${date}.`
    : "This subscription is already cancelled. Premium access remains available until the end of the paid period.";
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const subscription = await getUserSubscription(user.id);
  if (!subscription?.subscriptionId) {
    return NextResponse.json({ error: "No active subscription found." }, { status: 404 });
  }
  const subscriptionId = subscription.subscriptionId;

  const accessState = getSubscriptionAccessState(subscription);
  if (accessState === "cancelled") {
    return NextResponse.json(
      {
        error: alreadyCancelledMessage(subscription.endsAt),
        subscription: clientSubscription(subscription),
      },
      { status: 409 },
    );
  }
  if (accessState === "free") {
    return NextResponse.json({ error: "Your Premium subscription has already ended." }, { status: 409 });
  }

  try {
    const live = await getSubscriptionDetails(subscriptionId);
    if (live?.status === "cancelled") {
      await persistProviderCancellation({ userId: user.id, subscriptionId, details: live });
      return NextResponse.json(
        { error: alreadyCancelledMessage(live.endsAt), subscription: clientSubscription(live) },
        { status: 409 },
      );
    }
    if (live?.status === "expired") {
      return NextResponse.json({ error: "Your Premium subscription has already ended." }, { status: 409 });
    }

    let details: LemonSqueezySubscriptionDetails = await cancelSubscriptionAtPeriodEnd(subscriptionId);
    if (details.status === "cancelled" && !details.endsAt) {
      details = (await getSubscriptionDetails(subscriptionId)) ?? details;
    }

    if (details.status !== "cancelled") {
      console.error("Lemon Squeezy did not report the subscription as cancelled", { status: details.status });
      return NextResponse.json({ error: "Unable to cancel subscription." }, { status: 502 });
    }

    await persistProviderCancellation({ userId: user.id, subscriptionId, details });

    return NextResponse.json({ cancelled: true, subscription: clientSubscription(details) });
  } catch (error) {
    console.error("Subscription cancellation failed", error);
    return NextResponse.json({ error: "Unable to cancel subscription." }, { status: 502 });
  }
}
