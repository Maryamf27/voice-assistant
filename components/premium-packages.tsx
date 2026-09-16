"use client";

import { useState } from "react";
import type { PremiumPackage } from "@/lib/payment-provider";

export function PremiumPackages({ packages }: { packages: PremiumPackage[] }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function startCheckout(packageId: string) {
    setPending(packageId);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Unable to start checkout.");
      window.location.assign(result.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to start checkout.");
      setPending(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-xl border border-state-rose/30 bg-state-rose/10 p-3 text-sm text-state-rose">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {packages.map((item) => (
          <section key={item.id} className="rounded-2xl border border-base-border bg-base-card/90 p-5 shadow-panel">
            <p className="text-sm font-medium text-brand-violetSoft">{item.billingPeriod}</p>
            <h2 className="mt-2 text-lg font-semibold text-ink-primary">{item.name}</h2>
            <p className="mt-4 text-2xl font-semibold text-ink-primary">{item.priceLabel}</p>
            <button
              type="button"
              disabled={pending !== null || !item.priceId}
              onClick={() => startCheckout(item.id)}
              className="mt-6 w-full rounded-lg bg-brand-violet px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-violetDim disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending === item.id ? "Starting checkout…" : item.priceId ? "Subscribe" : "Not configured"}
            </button>
          </section>
        ))}
      </div>
    </div>
  );
}
