import { PageIntro } from "@/components/ui";
import { PremiumPackages } from "@/components/premium-packages";
import { PREMIUM_PACKAGES, getSubscriptionVariantId, isLemonSqueezyConfigured } from "@/lib/payment-provider";
import { getCurrentUser } from "@/lib/auth";
import { getUserSubscription } from "@/lib/entitlements";

export default function PremiumPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  return <PremiumContent searchParams={searchParams} />;
}

async function PremiumContent({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { checkout } = await searchParams;
  const user = await getCurrentUser();
  const subscription = user ? await getUserSubscription(user.id) : null;
  const isPremium = subscription?.plan === "premium" && subscription.subscriptionStatus === "active";
  const subscribedVariantId = isPremium ? await getSubscriptionVariantId(subscription?.subscriptionId ?? null) : null;
  return (
    <>
      <PageIntro eyebrow="Upgrade" title="Premium workspace" description="Unlock unrestricted Text to Speech generation with a verified subscription." />
      {checkout === "cancelled" && (
        <p className="mb-5 rounded-xl border border-base-border bg-base-surface p-3 text-sm text-ink-muted">
          Checkout was cancelled. No changes were made to your account.
        </p>
      )}
      {checkout === "success" && (
        <p className="mb-5 rounded-xl border border-audio-mint/30 bg-audio-mint/10 p-3 text-sm text-audio-mint">
          Payment received. Premium access will appear after the provider webhook is verified.
        </p>
      )}
      {!isLemonSqueezyConfigured() && (
        <p className="mb-5 rounded-xl border border-state-amber/30 bg-state-amber/10 p-3 text-sm text-state-amber">
          Premium checkout is not configured yet. Packages become available after the server-side Lemon Squeezy API key, store ID, webhook secret, and variant IDs are set.
        </p>
      )}
      <PremiumPackages packages={PREMIUM_PACKAGES} isPremium={isPremium} subscribedVariantId={subscribedVariantId} />
    </>
  );
}
