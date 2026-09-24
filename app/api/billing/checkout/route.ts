import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cancelSubscriptionAtPeriodEnd, createPremiumCheckout } from "@/lib/payment-provider";
import { getUserSubscription } from "@/lib/entitlements";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: { packageId?: unknown };
  try {
    body = (await request.json()) as { packageId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.packageId !== "monthly" && body.packageId !== "yearly") {
    return NextResponse.json({ error: "Invalid Premium package." }, { status: 400 });
  }

  try {
    const current = await getUserSubscription(user.id);
    if (current?.subscriptionId && current.packageId === body.packageId) {
      return NextResponse.json({ error: "You already have this Premium plan active." }, { status: 409 });
    }
    if (current?.subscriptionId && current.plan === "premium" && current.subscriptionStatus === "active") {
      await cancelSubscriptionAtPeriodEnd(current.subscriptionId);
    }

    const checkout = await createPremiumCheckout({
      packageId: body.packageId,
      userId: user.id,
      email: user.email,
    });
    return NextResponse.json(checkout);
  } catch (error) {
    console.error("Premium checkout creation failed", error);
    return NextResponse.json({ error: "Premium checkout is not configured yet." }, { status: 503 });
  }
}
