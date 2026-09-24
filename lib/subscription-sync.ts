import type { LemonSqueezySubscriptionDetails } from "@/lib/payment-provider";
import { createSupabaseAdminClient } from "./supabase/admin";

export async function persistProviderCancellation({
  userId,
  subscriptionId,
  details,
}: {
  userId: string;
  subscriptionId: string;
  details: LemonSqueezySubscriptionDetails;
}): Promise<void> {
  if (details.status !== "cancelled" || !details.endsAt) return;
  if (Date.parse(details.endsAt) <= Date.now()) return;

  try {
    const supabase = createSupabaseAdminClient();
    const now = new Date().toISOString();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        plan: "premium",
        subscription_status: "cancelled",
        subscription_ends_at: details.endsAt,
        ...(details.renewsAt ? { subscription_renews_at: details.renewsAt } : {}),
        updated_at: now,
      })
      .eq("id", userId)
      .eq("lemonsqueezy_subscription_id", subscriptionId);
    if (profileError) console.error("Could not persist cancelled profile state", profileError);

    const { error: historyError } = await supabase
      .from("subscription_history")
      .update({
        status: "cancelled",
        ends_at: details.endsAt,
        ...(details.renewsAt ? { renews_at: details.renewsAt } : {}),
        updated_at: now,
      })
      .eq("user_id", userId)
      .eq("lemonsqueezy_subscription_id", subscriptionId);
    if (historyError) console.error("Could not persist cancelled history state", historyError);
  } catch (error) {
    console.error("Could not persist provider cancellation", error);
  }
}
