"use client";

import { useState } from "react";
import { IconCheck } from "@/components/icons";
import type { PremiumPackageId, PublicPremiumPackage } from "@/lib/payment-provider";

type ButtonState = "upgrade" | "current" | "switch" | "unconfigured";

function resolveButtonState({
  isPremium,
  isCurrentPlan,
  isConfigured,
}: {
  isPremium: boolean;
  isCurrentPlan: boolean;
  isConfigured: boolean;
}): ButtonState {
  if (!isConfigured) return "unconfigured";
  if (isCurrentPlan) return "current";
  if (isPremium) return "switch";
  return "upgrade";
}

function planButtonLabel({
  state,
  isYearly,
  isPending,
}: {
  state: ButtonState;
  isYearly: boolean;
  isPending: boolean;
}) {
  if (isPending) return "Processing\u2026";
  switch (state) {
    case "unconfigured":
      return "Not available";
    case "current":
      return "Current plan";
    case "switch":
      return isYearly ? "Switch to Yearly" : "Switch to Monthly";
    case "upgrade":
      return "Upgrade to Premium";
  }
}

export function PremiumPackages({
  packages,
  isPremium,
  activePackageId,
  yearlySavingsMessage,
}: {
  packages: PublicPremiumPackage[];
  isPremium: boolean;
  activePackageId: PremiumPackageId | null;
  yearlySavingsMessage: string | null;
}) {
  const [pending, setPending] = useState<PremiumPackageId | null>(null);
  const [error, setError] = useState("");

  async function startCheckout(packageId: PremiumPackageId) {
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
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-xl border border-state-rose/30 bg-state-rose/10 px-4 py-3 text-sm text-state-rose">
          {error}
        </p>
      )}
      <div className="mx-auto grid max-w-5xl items-stretch gap-5 sm:gap-6 md:grid-cols-2 lg:gap-8">
        {packages.map((item) => {
          const isYearly = item.id === "yearly";
          const isPending = pending === item.id;
          const isCurrentPlan = isPremium && activePackageId === item.id;
          const buttonState = resolveButtonState({
            isPremium,
            isCurrentPlan,
            isConfigured: item.isConfigured,
          });
          const label = planButtonLabel({
            state: buttonState,
            isYearly,
            isPending,
          });
          const disableCheckout = pending !== null || buttonState === "unconfigured" || buttonState === "current";

          return (
            <section
              key={item.id}
              aria-labelledby={`${item.id}-plan-title`}
              className={`relative flex h-full flex-col rounded-2xl border p-6 shadow-panel transition-shadow duration-300 sm:p-7 ${
                isYearly
                  ? "border-brand-violet/60 shadow-glowViolet"
                  : "border-base-border bg-base-card/90 hover:border-base-border/80"
              }`}
            >
              {/* Subtle aurora glow for yearly */}
              {isYearly && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl bg-aurora-violet" />
              )}

              {/* ── Header: interval label + badge ── */}
              <div className="relative flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-violetSoft">
                  {item.intervalLabel}
                </p>
                {isYearly && (
                  <span className="rounded-full border border-brand-violet/40 bg-brand-violet/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-brand-violetSoft">
                    Best value
                  </span>
                )}
              </div>

              {/* ── Title ── */}
              <h2
                id={`${item.id}-plan-title`}
                className="relative mt-4 text-xl font-semibold text-ink-primary"
              >
                {item.name}
              </h2>

              {/* ── Description ── */}
              <p className="relative mt-2 min-h-[48px] text-sm leading-6 text-ink-muted">
                {item.description}
              </p>

              {/* ── Price ── */}
              <div className="relative mt-6 flex items-baseline gap-2">
                <span className="font-display text-4xl font-semibold tracking-tight text-ink-primary sm:text-[2.5rem]">
                  {item.priceLabel}
                </span>
                <span className="text-sm text-ink-muted">{item.billingPeriod}</span>
              </div>

              {/* ── Yearly savings note ── */}
              {isYearly && yearlySavingsMessage && (
                <p className="relative mt-2 text-sm font-medium text-brand-violetSoft">
                  {yearlySavingsMessage}
                </p>
              )}

              {/* ── Features ── */}
              <ul
                className="relative mt-6 flex flex-1 flex-col gap-3 border-t border-base-border/60 pt-5"
                aria-label={`${item.name} features`}
              >
                {item.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-sm text-ink-muted">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-violet/15 text-brand-violetSoft"
                      aria-hidden="true"
                    >
                      <IconCheck className="h-3.5 w-3.5" />
                    </span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              {/* ── CTA Button ── */}
              <button
                type="button"
                aria-label={label}
                aria-current={isCurrentPlan ? "true" : undefined}
                aria-disabled={disableCheckout}
                disabled={disableCheckout}
                onClick={() => startCheckout(item.id)}
                className={`relative mt-7 w-full rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-violet ${
                  buttonState === "current"
                    ? "cursor-default border border-base-border bg-base-surface text-ink-muted"
                    : buttonState === "unconfigured"
                      ? "cursor-not-allowed border border-base-border bg-base-surface text-ink-faint opacity-60"
                      : isYearly
                        ? "bg-brand-violet text-white shadow-glowViolet hover:bg-brand-violetDim hover:shadow-none active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                        : "bg-brand-violet/90 text-white hover:bg-brand-violet active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                }`}
              >
                {isPending && (
                  <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white align-middle" />
                )}
                {label}
              </button>

              {/* ── Current plan indicator ── */}
              {isCurrentPlan && (
                <p className="relative mt-2.5 text-center text-xs text-ink-faint">
                  This is your active billing plan.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
