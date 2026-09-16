import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Plan, SubscriptionStatus, UserSubscription } from "@/lib/supabase/types";

export async function getUserSubscription(userId?: string): Promise<UserSubscription | null> {
  const user = await getCurrentUser();
  const authenticatedUserId = user?.id;
  const requestedUserId = userId ?? authenticatedUserId;

  if (!authenticatedUserId || !requestedUserId || requestedUserId !== authenticatedUserId) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("plan, subscription_status")
    .eq("id", authenticatedUserId)
    .single();

  if (error || !data) return null;
  return {
    plan: data.plan as Plan,
    subscriptionStatus: data.subscription_status as SubscriptionStatus,
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
