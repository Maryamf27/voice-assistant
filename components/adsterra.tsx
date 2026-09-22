"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import {
  ADSTERRA_BANNER_CONFIGURED,
  ADSTERRA_BANNER_HEIGHT,
  ADSTERRA_BANNER_KEY,
  ADSTERRA_BANNER_SCRIPT_SRC,
  ADSTERRA_BANNER_WIDTH,
  ADSTERRA_ELIGIBILITY_DELAY_MS,
  ADSTERRA_NATIVE_CONFIGURED,
  ADSTERRA_NATIVE_CONTAINER_ID,
  ADSTERRA_NATIVE_HEIGHT,
  ADSTERRA_NATIVE_SCRIPT_SRC,
} from "@/lib/adsterra";

const AdsVisibleContext = createContext(false);

/**
 * Controls when Free users become eligible for Adsterra ads.
 *
 * The timer runs once when `enabled` becomes true (once per dashboard session). It is not
 * restarted by route changes, re-renders, or by individual AdSlot mounts - a slot that appears
 * later (e.g. while a voice is being cloned) uses whatever eligibility state the session already
 * reached.
 */
export function AdsterraProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setTimeout(() => setEligible(true), ADSTERRA_ELIGIBILITY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  return <AdsVisibleContext.Provider value={enabled && eligible}>{children}</AdsVisibleContext.Provider>;
}

/**
 * A single Adsterra ad unit.
 *
 * Every ad is rendered inside a sandboxed `<iframe srcDoc>` instead of being injected straight
 * into the page. Two reasons:
 *   1. Adsterra's snippets use `document.write`, which modern browsers refuse to run from a
 *      script tag that was appended into an already-loaded document (React mounts everything
 *      after load). A fresh iframe document is always "still loading" from the ad script's point
 *      of view, so `document.write` works the way Adsterra expects.
 *   2. The sandbox is intentionally missing `allow-top-navigation` / `allow-top-navigation-by-user-
 *      activation`. That means an ad creative can open its landing page in a new tab when the user
 *      clicks it (`allow-popups`), but it is structurally unable to redirect the app itself. This
 *      is what keeps "the app" from ever getting hijacked to an advertiser's site.
 *
 * Renders nothing for Premium users, before the eligibility delay elapses, or when the
 * corresponding ad unit isn't configured (see lib/adsterra.ts).
 */
export function AdSlot({
  className = "",
  variant = "banner",
}: {
  className?: string;
  variant?: "banner" | "native";
}) {
  const visible = useContext(AdsVisibleContext);
  if (!visible) return null;

  if (variant === "native") {
    if (!ADSTERRA_NATIVE_CONFIGURED || !ADSTERRA_NATIVE_SCRIPT_SRC || !ADSTERRA_NATIVE_CONTAINER_ID) return null;
    return (
      <AdFrame
        className={className}
        height={ADSTERRA_NATIVE_HEIGHT}
        html={buildNativeHtml(ADSTERRA_NATIVE_SCRIPT_SRC, ADSTERRA_NATIVE_CONTAINER_ID)}
      />
    );
  }

  if (!ADSTERRA_BANNER_CONFIGURED || !ADSTERRA_BANNER_KEY || !ADSTERRA_BANNER_SCRIPT_SRC) return null;
  return (
    <AdFrame
      className={className}
      width={ADSTERRA_BANNER_WIDTH}
      height={ADSTERRA_BANNER_HEIGHT}
      html={buildBannerHtml(ADSTERRA_BANNER_KEY, ADSTERRA_BANNER_SCRIPT_SRC, ADSTERRA_BANNER_WIDTH, ADSTERRA_BANNER_HEIGHT)}
    />
  );
}

const FRAME_BASE_STYLE = `html,body{margin:0;padding:0;background:transparent;overflow:hidden;}`;

function buildBannerHtml(key: string, scriptSrc: string, width: number, height: number): string {
  // JSON.stringify keeps this safe even though the inputs are already validated in lib/adsterra.ts.
  const atOptions = JSON.stringify({ key, format: "iframe", height, width, params: {} });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${FRAME_BASE_STYLE}</style></head><body>
<script>atOptions = ${atOptions};</script>
<script src="${scriptSrc}"></script>
</body></html>`;
}

function buildNativeHtml(scriptSrc: string, containerId: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${FRAME_BASE_STYLE}</style></head><body>
<div id="${containerId}"></div>
<script async="async" data-cfasync="false" src="${scriptSrc}"></script>
</body></html>`;
}

function AdFrame({
  className,
  html,
  width,
  height,
}: {
  className: string;
  html: string;
  width?: number;
  height: number;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className={`flex flex-col-reverse gap-1.5 ${className}`}>
      <div className="relative mx-auto w-full overflow-hidden" style={{ maxWidth: width ?? "100%" }}>
        <iframe
          srcDoc={html}
          title="Advertisement"
          scrolling="no"
          // No allow-top-navigation(-by-user-activation): the ad can open a click-through in a new
          // tab (allow-popups) but can never redirect the app itself.
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          style={{ width: "100%", height, border: "none", display: "block" }}
        />
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Close advertisement"
          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-base-bg/80 text-ink-muted shadow-sm ring-1 ring-base-border backdrop-blur transition hover:bg-base-bg hover:text-ink-primary"
        >
          <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">Advertisement</p>
    </div>
  );
}
