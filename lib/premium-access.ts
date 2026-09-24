import type { UserSubscription } from "@/lib/supabase/types";

export type PremiumAccessSubscription = Pick<
  UserSubscription,
  "plan" | "subscriptionStatus" | "endsAt"
>;

export type SubscriptionAccessState = "active" | "cancelled" | "free";

export function getSubscriptionAccessState(
  subscription: PremiumAccessSubscription | null | undefined,
  now: Date = new Date(),
): SubscriptionAccessState {
  if (!subscription || subscription.plan !== "premium") return "free";

  if (subscription.subscriptionStatus === "active") return "active";

  if (subscription.subscriptionStatus === "cancelled" && subscription.endsAt) {
    const endsAtMs = Date.parse(subscription.endsAt);
    if (!Number.isNaN(endsAtMs) && now.getTime() < endsAtMs) return "cancelled";
  }

  return "free";
}

export function hasPremiumAccess(
  subscription: PremiumAccessSubscription | null | undefined,
  now: Date = new Date(),
): boolean {
  return getSubscriptionAccessState(subscription, now) !== "free";
}
