import { PageIntro } from "@/components/ui";
import { SubscriptionPanel } from "@/components/subscription-panel";
import { getCurrentUser } from "@/lib/auth";
import { getUserSubscription } from "@/lib/entitlements";

export default async function SubscriptionsPage() {
  const user = await getCurrentUser();
  const subscription = user ? await getUserSubscription(user.id) : null;
  const isPremium = subscription?.plan === "premium" && subscription.subscriptionStatus === "active";

  return (
    <>
      <PageIntro eyebrow="Account" title="Subscriptions" description="Manage your Premium access and billing status." />
      <SubscriptionPanel subscription={subscription} isPremium={isPremium} />
    </>
  );
}
