import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type {
  Plan,
  SubscriptionStatus,
  UserSubscription,
} from "@/lib/supabase/types";

export {
  FREE_TTS_CHARACTER_LIMIT,
  MAX_TTS_REQUEST_LENGTH,
  getTTSCharacterLimit,
  countTTSCharacters,
} from "@/lib/entitlement-constants";

export async function getUserSubscription(
  userId?: string,
): Promise<UserSubscription | null> {
  const user = await getCurrentUser();

  const authenticatedUserId = user?.id;
  const requestedUserId = userId ?? authenticatedUserId;

  if (
    !authenticatedUserId ||
    !requestedUserId ||
    requestedUserId !== authenticatedUserId
  ) {
    return null;
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
        plan,
        subscription_status,
        lemonsqueezy_subscription_id,
        lemonsqueezy_customer_id,
        lemonsqueezy_variant_id,
        subscription_interval,
        subscription_ends_at
      `,
    )
    .eq("id", authenticatedUserId)
    .single();

  if (error || !data) {
    console.error("Could not load user subscription:", error);
    return null;
  }

  return {
    plan: data.plan as Plan,

    subscriptionStatus:
      data.subscription_status as SubscriptionStatus,

    subscriptionId:
      data.lemonsqueezy_subscription_id,

    customerId:
      data.lemonsqueezy_customer_id,

    endsAt:
      data.subscription_ends_at,

    variantId:
      data.lemonsqueezy_variant_id,

    packageId:
      data.subscription_interval === "monthly" ||
      data.subscription_interval === "yearly"
        ? data.subscription_interval
        : null,
  };
}

export async function getUserPlan(
  userId?: string,
): Promise<Plan> {
  const subscription = await getUserSubscription(userId);

  return subscription?.plan ?? "free";
}

export async function isPremium(
  userId?: string,
): Promise<boolean> {
  const subscription = await getUserSubscription(userId);

  return (
    subscription?.plan === "premium" &&
    subscription.subscriptionStatus === "active"
  );
}

export async function getTTSAccess(
  userId: string,
): Promise<{
  plan: Plan;
  isPremium: boolean;
}> {
  const subscription = await getUserSubscription(userId);

  const premium =
    subscription?.plan === "premium" &&
    subscription.subscriptionStatus === "active";

  return {
    plan: premium ? "premium" : "free",
    isPremium: premium,
  };
}