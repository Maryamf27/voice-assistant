"use client";

import Link from "next/link";
import { useState } from "react";
import type { UserSubscription } from "@/lib/supabase/types";

export function SubscriptionPanel({ subscription, isPremium }: { subscription: UserSubscription | null; isPremium: boolean }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function cancelSubscription() {
    if (!window.confirm("Cancel your subscription? Premium access will remain until the current billing period ends.")) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/billing/cancel", { method: "POST" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to cancel subscription.");
      setMessage("Cancellation requested. Premium access remains active until the billing period ends.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to cancel subscription.");
    } finally {
      setPending(false);
    }
  }

  if (!isPremium) {
    return (
      <section className="rounded-2xl border border-brand-violet/30 bg-brand-violet/[0.08] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-violetSoft">Subscription</p>
        <h2 className="mt-3 text-xl font-semibold text-ink-primary">Get Premium to unlock features</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">Unlock unrestricted Text to Speech generation and the full premium workspace.</p>
        <Link href="/dashboard/premium" className="mt-5 inline-flex rounded-lg bg-brand-violet px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-violetDim">Get Premium</Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-audio-mint/30 bg-audio-mint/[0.06] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-audio-mint">Subscription</p>
          <h2 className="mt-3 text-xl font-semibold text-ink-primary">Premium subscription</h2>
          <p className="mt-2 text-sm text-ink-muted">Your premium workspace is unlocked.</p>
        </div>
        <span className="rounded-full border border-audio-mint/30 bg-audio-mint/10 px-3 py-1 text-xs font-semibold text-audio-mint">Active</span>
      </div>
      <dl className="mt-6 grid gap-4 border-t border-audio-mint/15 pt-5 text-sm sm:grid-cols-2">
        <div><dt className="text-ink-faint">Plan</dt><dd className="mt-1 font-medium text-ink-primary">Premium</dd></div>
        <div><dt className="text-ink-faint">Subscription ID</dt><dd className="mt-1 truncate font-mono text-xs text-ink-muted">{subscription?.subscriptionId ?? "Verified subscription"}</dd></div>
        {subscription?.endsAt && <div><dt className="text-ink-faint">Access through</dt><dd className="mt-1 text-ink-primary">{new Date(subscription.endsAt).toLocaleDateString()}</dd></div>}
      </dl>
      {message && <p role="status" className="mt-5 rounded-lg border border-base-border bg-base-surface p-3 text-sm text-ink-muted">{message}</p>}
      <button type="button" onClick={cancelSubscription} disabled={pending || !subscription?.subscriptionId} className="mt-6 rounded-lg border border-state-rose/40 px-4 py-2.5 text-sm font-semibold text-state-rose transition hover:bg-state-rose/10 disabled:cursor-not-allowed disabled:opacity-100">{pending ? "Cancelling…" : "Cancel subscription"}</button>
    </section>
  );
}
