"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PremiumPackageId, UserSubscription } from "@/lib/supabase/types";
import type { SubscriptionHistoryItem } from "@/lib/supabase/types";
import { ConfirmDialog } from "@/components/dialog";
import {
  billingIntervalLabel,
  formatCurrencyPrice,
  formatPakistanShortDate,
  normalizeStatusLabel,
  statusTone,
} from "@/lib/subscription-display";
import { getPremiumPackage } from "@/lib/payment-provider";
import { IconCheck } from "@/components/icons";
import { getSubscriptionAccessState } from "@/lib/premium-access";

export function SubscriptionPanel({
  subscription,
  isPremium,
  history,
}: {
  subscription: UserSubscription | null;
  isPremium: boolean;
  history?: SubscriptionHistoryItem[] | null;
}) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [providerCancellation, setProviderCancellation] = useState<Pick<
    UserSubscription,
    "subscriptionStatus" | "renewsAt" | "endsAt"
  > | null>(null);

  async function cancelSubscription() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/billing/cancel", { method: "POST" });
      const result = (await response.json()) as {
        error?: string;
        subscription?: { status?: string; renewsAt?: string | null; endsAt?: string | null };
      };
      if (result.subscription?.status === "cancelled") {
        setProviderCancellation({
          subscriptionStatus: "cancelled",
          renewsAt: result.subscription.renewsAt ?? null,
          endsAt: result.subscription.endsAt ?? null,
        });
      }

      if (!response.ok) throw new Error(result.error ?? "Unable to cancel subscription.");

      const endsLabel = formatPakistanShortDate(result.subscription?.endsAt);
      setMessage(
        endsLabel
          ? `Subscription cancelled. Premium access remains available until ${endsLabel}.`
          : "Subscription cancelled. Premium access remains available until the end of your paid period.",
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to cancel subscription.",
      );
    } finally {
      setPending(false);
      setCancelOpen(false);
    }
  }

  const currentSubscription: UserSubscription | null =
    subscription && providerCancellation
      ? { ...subscription, ...providerCancellation }
      : subscription;

  const effectivePackageId: PremiumPackageId | null =
    currentSubscription?.packageId ?? null;
  const matchedPackage =
    effectivePackageId != null ? getPremiumPackage(effectivePackageId) : null;
  const displayInterval = billingIntervalLabel(effectivePackageId);
  const displayPrice = matchedPackage
    ? formatCurrencyPrice({
      price: matchedPackage.priceAmount,
      currency: matchedPackage.currency,
    })
    : formatCurrencyPrice({
      price: null,
      currency: null,
    });

  if (!isPremium) {
    const hadPremium =
      Boolean(subscription?.subscriptionId) || (history ?? []).length > 0;

    return (
      <section className="space-y-8">
        <section className="rounded-2xl border border-brand-violet/30 bg-brand-violet/[0.08] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-violetSoft">
            Subscription
          </p>
          <h2 className="mt-3 text-xl font-semibold text-ink-primary">
            {hadPremium ? "Premium access has ended." : "Get Premium to unlock features"}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
            {hadPremium
              ? "You are on the Free plan. Your saved voices and history are preserved. You can choose a Premium plan again at any time."
              : "Unlock unrestricted Text to Speech generation and the full premium workspace."}
          </p>
          <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-ink-faint">Next billing</p>
              <p className="mt-1 font-medium text-ink-primary">—</p>
            </div>
            <div>
              <p className="text-ink-faint">Access through</p>
              <p className="mt-1 font-medium text-ink-primary">—</p>
            </div>
          </div>
          <Link
            href="/dashboard/premium"
            className="mt-5 inline-flex rounded-lg bg-brand-violet px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-violetDim"
          >
            {hadPremium ? "View Premium plans" : "Get Premium"}
          </Link>
        </section>
        <SubscriptionHistory history={history ?? []} />
      </section>
    );
  }

  const isCancelled = getSubscriptionAccessState(currentSubscription) === "cancelled";
  const currentStatus = normalizeStatusLabel(isCancelled ? "cancelled" : "active");
  const currentTone = statusTone(currentStatus);

  const startedLabel =
    formatPakistanShortDate(
      history?.find(
        (h) =>
          h.subscriptionId &&
          currentSubscription?.subscriptionId &&
          h.subscriptionId === currentSubscription.subscriptionId,
      )?.startedAt,
    ) ?? "Date unavailable";
  const endsLabel = formatPakistanShortDate(currentSubscription?.endsAt);
  const renewsLabel = formatPakistanShortDate(currentSubscription?.renewsAt);
  const nextBillingLabel = isCancelled ? "No future billing" : renewsLabel ?? "Date unavailable";
  const accessThroughLabel = (isCancelled ? endsLabel : renewsLabel) ?? "Date unavailable";

  return (
    <section className="space-y-8">
      <section className="rounded-2xl border border-audio-mint/30 bg-audio-mint/[0.06] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-audio-mint">
              Current subscription
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-ink-primary">
              Premium <span className="text-brand-violetSoft">· {displayInterval.interval}</span>
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              {isCancelled
                ? "Your current plan will remain available until your paid period ends."
                : "Your premium workspace is unlocked."}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${currentTone.pill}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${currentTone.dot}`} />
            {currentStatus}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-audio-mint/15 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-ink-faint">Price</dt>
            <dd className="mt-1 font-medium text-ink-primary">
              {matchedPackage ? (
                <>
                  {displayPrice}
                  <span className="ml-1 text-ink-muted">
                    {displayInterval.period}
                  </span>
                </>
              ) : (
                <span className="text-ink-muted">Price unavailable</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Billing</dt>
            <dd className="mt-1 font-medium text-ink-primary">
              {displayInterval.interval}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Started</dt>
            <dd className="mt-1 font-medium text-ink-primary">
              {startedLabel}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Next billing</dt>
            <dd className="mt-1 font-medium text-ink-primary">
              {nextBillingLabel}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Access through</dt>
            <dd className="mt-1 font-medium text-ink-primary">
              {accessThroughLabel}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Subscription ID</dt>
            <dd
              className="mt-1 truncate font-mono text-xs text-ink-muted"
              title={currentSubscription?.subscriptionId ?? undefined}
            >
              {currentSubscription?.subscriptionId ?? "—"}
            </dd>
          </div>
        </dl>

        {isCancelled && (
          <p className="mt-5 rounded-lg border border-state-rose/25 bg-state-rose/[0.06] p-3 text-sm leading-6 text-ink-muted">
            Your subscription has been cancelled. Premium access remains available until{" "}
            <span className="font-medium text-ink-primary">
              {endsLabel ?? "the end of your paid period"}
            </span>
            . No future renewal payment will be charged.
          </p>
        )}

        {message && (
          <p
            role="status"
            className="mt-5 rounded-lg border border-base-border bg-base-surface p-3 text-sm text-ink-muted"
          >
            {message}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!isCancelled && (
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              disabled={pending || !currentSubscription?.subscriptionId}
              className="rounded-lg border border-state-rose/40 px-4 py-2.5 text-sm font-semibold text-state-rose transition hover:bg-state-rose/10 disabled:cursor-not-allowed disabled:opacity-100"
            >
              {pending ? "Cancelling…" : "Cancel subscription"}
            </button>
          )}
          <Link
            href="/dashboard/premium"
            className="rounded-lg border border-brand-violet/30 bg-brand-violet/10 px-4 py-2.5 text-sm font-semibold text-brand-violetSoft transition hover:bg-brand-violet/20"
          >
            View Premium plans
          </Link>
        </div>
      </section>

      <SubscriptionHistory history={history ?? []} />

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel your subscription?"
        description="Premium access will remain available until the current billing period ends. Your saved voices and history are preserved."
        confirmLabel="Cancel subscription"
        cancelLabel="Keep subscription"
        destructive
        loading={pending}
        onConfirm={cancelSubscription}
        onCancel={() => setCancelOpen(false)}
      />
    </section>
  );
}

function SubscriptionHistory({ history }: { history: SubscriptionHistoryItem[] }) {
  if (!history || history.length === 0) {
    return (
      <section className="rounded-2xl border border-base-border bg-base-card/60 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Subscription history
        </p>
        <p className="mt-4 text-sm text-ink-muted">
          No subscription history yet.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Subscription history
        </p>
        <span className="text-[11px] text-ink-faint">
          {history.length} {history.length === 1 ? "record" : "records"}
        </span>
      </div>

      <div className="space-y-3">
        {history.map((item) => {
          const interval = billingIntervalLabel(item.packageId);
          const matchedPackage =
            item.packageId != null ? getPremiumPackage(item.packageId) : null;
          const effectivePrice =
            matchedPackage?.priceAmount ?? item.price ?? null;
          const effectiveCurrency =
            matchedPackage?.currency ?? item.currency ?? null;
          const labelStatus = normalizeStatusLabel(item.status);
          const tone = statusTone(labelStatus);
          const started = formatPakistanShortDate(item.startedAt ?? item.createdAt);
          const renews = formatPakistanShortDate(item.renewsAt);
          const ended = formatPakistanShortDate(item.endsAt);

          return (
            <article
              key={item.id}
              className="rounded-2xl border border-base-border bg-base-card/80 p-5 shadow-panel transition hover:border-base-border/80"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-ink-primary">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-brand-violet/30 bg-brand-violet/10 text-[10px] text-brand-violetSoft">
                      <IconCheck className="h-3.5 w-3.5" />
                    </span>
                    Premium
                    <span className="text-brand-violetSoft">· {interval.interval}</span>
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${tone.pill}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${tone.dot}`}
                      />
                      {labelStatus}
                    </span>
                  </div>
                </div>
                <p className="text-right">
                  <span className="font-display text-lg font-semibold text-ink-primary">
                    {effectivePrice != null
                      ? formatCurrencyPrice({
                        price: effectivePrice,
                        currency: effectiveCurrency,
                      })
                      : "Price unavailable"}
                  </span>
                  {interval.known && (
                    <span className="ml-1 text-xs text-ink-muted">
                      {interval.period}
                    </span>
                  )}
                </p>
              </div>

              <dl className="mt-5 grid gap-4 border-t border-base-border/60 pt-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-ink-faint">Billing</dt>
                  <dd className="mt-1 font-medium text-sm text-ink-primary">
                    {interval.interval}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-faint">Started</dt>
                  <dd className="mt-1 font-medium text-sm text-ink-primary">
                    {started ?? "Date unavailable"}
                  </dd>
                </div>
                {renews && !ended && (
                  <div>
                    <dt className="text-ink-faint">Next billing</dt>
                    <dd className="mt-1 font-medium text-sm text-ink-primary">
                      {renews}
                    </dd>
                  </div>
                )}
                {ended && (
                  <div>
                    <dt className="text-ink-faint">Ended</dt>
                    <dd className="mt-1 font-medium text-sm text-ink-primary">
                      {ended}
                    </dd>
                  </div>
                )}
                <div className="sm:col-span-2 lg:col-span-3">
                  <dt className="text-ink-faint">Subscription ID</dt>
                  <dd
                    className="mt-1 truncate font-mono text-[11px] text-ink-muted"
                    title={item.subscriptionId}
                  >
                    {item.subscriptionId}
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}