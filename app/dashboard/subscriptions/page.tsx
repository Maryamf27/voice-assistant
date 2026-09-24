import { PageIntro } from "@/components/ui";
import { SubscriptionPanel } from "@/components/subscription-panel";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserSubscription,
  getSubscriptionHistory,
  hasPremiumAccess,
} from "@/lib/entitlements";

export default async function SubscriptionsPage() {
  const user = await getCurrentUser();
  const subscription = user ? await getUserSubscription(user.id) : null;
  const isPremium = hasPremiumAccess(subscription);
  const history = user ? await getSubscriptionHistory(user.id) : [];

  return (
    <>
      <PageIntro
        eyebrow="Account"
        title="Subscriptions"
        description="Manage your Premium access and billing status."
      />
      <SubscriptionPanel
        subscription={subscription}
        isPremium={isPremium}
        history={history}
      />
    </>
  );
}
