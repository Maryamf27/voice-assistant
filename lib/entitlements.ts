import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser, getSessionProfile } from "@/lib/auth";
import type {
  Plan,
  PremiumPackageId,
  SubscriptionStatus,
  SubscriptionHistoryItem,
  UserSubscription,
} from "@/lib/supabase/types";

export {
  FREE_TTS_CHARACTER_LIMIT,
  MAX_TTS_REQUEST_LENGTH,
  getTTSCharacterLimit,
  countTTSCharacters,
} from "@/lib/entitlement-constants";

export const getUserSubscription = cache(async function getUserSubscription(
  userId?: string,
): Promise<UserSubscription | null> {
  const { user, profile } = await getSessionProfile();

  const authenticatedUserId = user?.id;
  const requestedUserId = userId ?? authenticatedUserId;

  if (
    !authenticatedUserId ||
    !requestedUserId ||
    requestedUserId !== authenticatedUserId
  ) {
    return null;
  }

  if (!profile) return null;

  const rawInterval = profile.subscription_interval as string | null;
  const packageId: PremiumPackageId | null =
    rawInterval === "monthly" || rawInterval === "yearly"
      ? rawInterval
      : null;

  return {
    plan: profile.plan as Plan,

    subscriptionStatus:
      profile.subscription_status as SubscriptionStatus,

    subscriptionId:
      profile.lemonsqueezy_subscription_id,

    customerId:
      profile.lemonsqueezy_customer_id,

    endsAt:
      profile.subscription_ends_at,

    renewsAt:
      (profile as typeof profile & { subscription_renews_at?: string | null })
        .subscription_renews_at ?? null,

    variantId:
      profile.lemonsqueezy_variant_id,

    packageId,
  };
});

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

export const getSubscriptionHistory = cache(async function getSubscriptionHistory(
  userId?: string,
): Promise<SubscriptionHistoryItem[]> {
  const user = await getCurrentUser();
  const authenticatedUserId = user?.id;
  const requestedUserId = userId ?? authenticatedUserId;

  if (
    !authenticatedUserId ||
    !requestedUserId ||
    requestedUserId !== authenticatedUserId
  ) {
    return [];
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("subscription_history")
    .select(
      `
        id,
        lemonsqueezy_subscription_id,
        lemonsqueezy_customer_id,
        lemonsqueezy_variant_id,
        subscription_interval,
        plan,
        status,
        price,
        currency,
        started_at,
        renews_at,
        ends_at,
        created_at
      `,
    )
    .eq("user_id", requestedUserId)
    .order("started_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load subscription history:", error);
    return [];
  }

  return (data ?? []).map<SubscriptionHistoryItem>((row) => {
    const rawInterval = row.subscription_interval as string | null;
    const packageId: PremiumPackageId | null =
      rawInterval === "monthly" || rawInterval === "yearly"
        ? rawInterval
        : null;

    return {
      id: row.id,
      subscriptionId: row.lemonsqueezy_subscription_id,
      customerId: row.lemonsqueezy_customer_id,
      variantId: row.lemonsqueezy_variant_id,
      packageId,
      plan: row.plan,
      status: row.status,
      price: row.price,
      currency: row.currency,
      startedAt: row.started_at,
      renewsAt: row.renews_at,
      endsAt: row.ends_at,
      createdAt: row.created_at,
    };
  });
});
