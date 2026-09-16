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
    <div className="space-y-5">
      {error && (
        <p role="alert" className="rounded-xl border border-state-rose/30 bg-state-rose/10 p-3 text-sm text-state-rose">
          {error}
        </p>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        {packages.map((item) => {
          const isYearly = item.id === "yearly";
          const isPending = pending === item.id;

          return (
            <section
              key={item.id}
              className={`relative flex flex-col rounded-2xl border bg-base-card/90 p-6 shadow-panel transition-colors ${
                isYearly ? "border-brand-violet/60" : "border-base-border"
              }`}
            >
              {isYearly && (
                <span className="absolute right-5 top-5 rounded-full border border-brand-violet/40 bg-brand-violet/10 px-2.5 py-1 text-xs font-medium text-brand-violetSoft">
                  Yearly billing
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-violetSoft">{item.billingPeriod}</p>
              <h2 className="mt-4 text-xl font-semibold text-ink-primary">{item.name}</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-ink-muted">{item.description}</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight text-ink-primary">{item.priceLabel}</span>
                <span className="text-sm text-ink-muted">{item.billingPeriod}</span>
              </div>
              <ul className="mt-6 flex flex-col gap-3 border-t border-base-border pt-5" aria-label={`${item.name} benefits`}>
                {item.benefits.map((benefit) => (
                  <li key={benefit} className="flex gap-3 text-sm text-ink-muted">
                    <span aria-hidden="true" className="mt-0.5 text-brand-violetSoft">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={pending !== null || !item.variantId}
                onClick={() => startCheckout(item.id)}
                className="mt-7 w-full rounded-lg bg-brand-violet px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-violetDim disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Starting checkout…" : item.variantId ? `Subscribe ${isYearly ? "Yearly" : "Monthly"}` : "Not configured"}
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
