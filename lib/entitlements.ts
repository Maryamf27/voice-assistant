import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Plan, PremiumPackageId, SubscriptionStatus, UserSubscription } from "@/lib/supabase/types";
export { FREE_TTS_CHARACTER_LIMIT, MAX_TTS_REQUEST_LENGTH, getTTSCharacterLimit, countTTSCharacters } from "@/lib/entitlement-constants";

export async function getUserSubscription(userId?: string): Promise<UserSubscription | null> {
  const user = await getCurrentUser();
  const authenticatedUserId = user?.id;
  const requestedUserId = userId ?? authenticatedUserId;

  if (!authenticatedUserId || !requestedUserId || requestedUserId !== authenticatedUserId) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("plan, subscription_status, lemonsqueezy_subscription_id, lemonsqueezy_customer_id, lemonsqueezy_variant_id, premium_package_id, subscription_ends_at")
    .eq("id", authenticatedUserId)
    .single();

  if (!error && data) {
    return {
      plan: data.plan as Plan,
      subscriptionStatus: data.subscription_status as SubscriptionStatus,
      subscriptionId: data.lemonsqueezy_subscription_id,
      customerId: data.lemonsqueezy_customer_id,
      endsAt: data.subscription_ends_at,
      variantId: data.lemonsqueezy_variant_id,
      packageId: data.premium_package_id === "monthly" || data.premium_package_id === "yearly" ? data.premium_package_id : null,
    };
  }

  const fallback = await supabase
    .from("profiles")
    .select("plan, subscription_status, lemonsqueezy_subscription_id, lemonsqueezy_customer_id, subscription_ends_at")
    .eq("id", authenticatedUserId)
    .single();

  if (fallback.error || !fallback.data) return null;
  return {
    plan: fallback.data.plan as Plan,
    subscriptionStatus: fallback.data.subscription_status as SubscriptionStatus,
    subscriptionId: fallback.data.lemonsqueezy_subscription_id,
    customerId: fallback.data.lemonsqueezy_customer_id,
    endsAt: fallback.data.subscription_ends_at,
    variantId: null,
    packageId: null,
  };
}

export async function getUserPlan(userId?: string): Promise<Plan> {
  const subscription = await getUserSubscription(userId);
  return subscription?.plan ?? "free";
}

export async function isPremium(userId?: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  return subscription?.plan === "premium" && subscription.subscriptionStatus === "active";
}

export async function getTTSAccess(userId: string): Promise<{ plan: Plan; isPremium: boolean }> {
  const subscription = await getUserSubscription(userId);
  const premium = subscription?.plan === "premium" && subscription.subscriptionStatus === "active";
  return { plan: premium ? "premium" : "free", isPremium: premium };
}
