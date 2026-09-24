import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPremiumCheckout } from "@/lib/payment-provider";
import { getSubscriptionAccessState, getUserSubscription } from "@/lib/entitlements";
import { formatPakistanShortDate } from "@/lib/subscription-display";

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
    // One user = one valid Premium subscription. There is no plan switching:
    // an existing subscription is never cancelled or replaced here, and no
    // second checkout is created while it still grants access (active, or
    // cancelled but still before ends_at).
    const current = await getUserSubscription(user.id);
    const accessState = getSubscriptionAccessState(current);

    if (accessState === "active") {
      return NextResponse.json(
        {
          error:
            "You already have a Premium subscription. You can choose a different billing plan after your current subscription ends.",
        },
        { status: 409 },
      );
    }

    if (accessState === "cancelled") {
      const endsAt = formatPakistanShortDate(current?.endsAt);
      return NextResponse.json(
        {
          error: `Your current Premium subscription remains active until ${
            endsAt ?? "the end of your paid period"
          }. You can choose another plan after it expires.`,
        },
        { status: 409 },
      );
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
