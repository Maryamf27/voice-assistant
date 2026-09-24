import { PageIntro } from "@/components/ui";
import { PremiumPackages } from "@/components/premium-packages";
import { getPublicPremiumPackages, getYearlySavingsMessage, isLemonSqueezyConfigured, resolveActivePremiumPackageId } from "@/lib/payment-provider";
import { getCurrentUser } from "@/lib/auth";
import { getSubscriptionAccessState, getUserSubscription } from "@/lib/entitlements";

export default function PremiumPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  return <PremiumContent searchParams={searchParams} />;
}

async function PremiumContent({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { checkout } = await searchParams;
  const user = await getCurrentUser();
  const subscription = user ? await getUserSubscription(user.id) : null;
  const accessState = getSubscriptionAccessState(subscription);
  const activePackageId = accessState !== "free" ? await resolveActivePremiumPackageId(subscription) : null;
  const packages = getPublicPremiumPackages();
  const yearlySavingsMessage = getYearlySavingsMessage(packages);

  return (
    <>
      <PageIntro
        eyebrow="Upgrade"
        title="Premium Workspace"
        description="Choose monthly or yearly billing. Premium access is unlocked after your payment is confirmed."
      />

      {checkout === "cancelled" && (
        <p className="mb-6 rounded-xl border border-base-border bg-base-surface px-4 py-3 text-sm text-ink-muted">
          Checkout was cancelled. No changes were made to your account.
        </p>
      )}
      {checkout === "success" && (
        <div className="mb-6 rounded-xl border border-audio-mint/30 bg-audio-mint/[0.08] px-4 py-3">
          <p className="text-sm font-medium text-audio-mint">Payment received</p>
          <p className="mt-1 text-sm text-audio-mint/75">
            Your plan will update once the payment is verified. This usually takes a few seconds.
          </p>
        </div>
      )}
      {!isLemonSqueezyConfigured() && (
        <div className="mb-6 rounded-xl border border-state-amber/30 bg-state-amber/[0.08] px-4 py-3">
          <p className="text-sm font-medium text-state-amber">Checkout not configured</p>
          <p className="mt-1 text-sm text-state-amber/75">
            Premium checkout requires server-side Lemon Squeezy API key, store ID, webhook secret, and variant IDs.
          </p>
        </div>
      )}

      <PremiumPackages
        packages={packages}
        accessState={accessState}
        accessEndsAt={subscription?.endsAt ?? null}
        activePackageId={activePackageId}
        yearlySavingsMessage={yearlySavingsMessage}
      />
    </>
  );
}
