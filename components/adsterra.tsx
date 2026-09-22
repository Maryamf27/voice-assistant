"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
 *
 * Once eligible, a single interstitial ad (a centered dialog over a blurred backdrop) is shown
 * once for the session, on top of whatever inline AdSlot placements exist on the page. It closes
 * on its own X button, a backdrop click, or Escape, and does not reappear until the dashboard
 * layout remounts (e.g. a full page reload).
 */
export function AdsterraProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [eligible, setEligible] = useState(false);
  const [interstitialDismissed, setInterstitialDismissed] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setTimeout(() => setEligible(true), ADSTERRA_ELIGIBILITY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  const visible = enabled && eligible;

  return (
    <AdsVisibleContext.Provider value={visible}>
      {children}
      {visible && !interstitialDismissed && <AdInterstitial onClose={() => setInterstitialDismissed(true)} />}
    </AdsVisibleContext.Provider>
  );
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

  const frame = buildAdFrame(variant);
  if (!frame) return null;
  return <AdFrame className={className} width={frame.width} height={frame.height} html={frame.html} />;
}

/**
 * The popup ad: a centered card over a dark, blurred backdrop, portaled to <body> so it sits above
 * everything else in the dashboard. Closing it (X button, backdrop click, or Escape) dismisses it
 * for the rest of the session - it never re-appears mid-session, only after a fresh page load.
 */
function AdInterstitial({ onClose }: { onClose: () => void }) {
  const frame = buildAdFrame("banner") ?? buildAdFrame("native");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (!frame || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Advertisement"
        className="glass relative w-full max-w-sm rounded-2xl border border-base-border p-4 shadow-panel animate-fade-up"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">Advertisement</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close advertisement"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-base-surface hover:text-ink-primary"
          >
            <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="mt-3 mx-auto w-full overflow-hidden rounded-xl" style={{ maxWidth: frame.width ?? "100%" }}>
          <iframe
            srcDoc={frame.html}
            title="Advertisement"
            scrolling="no"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            style={{ width: "100%", height: frame.height, border: "none", display: "block" }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

function buildAdFrame(variant: "banner" | "native"): { html: string; width?: number; height: number } | null {
  if (variant === "native") {
    if (!ADSTERRA_NATIVE_CONFIGURED || !ADSTERRA_NATIVE_SCRIPT_SRC || !ADSTERRA_NATIVE_CONTAINER_ID) return null;
    return { height: ADSTERRA_NATIVE_HEIGHT, html: buildNativeHtml(ADSTERRA_NATIVE_SCRIPT_SRC, ADSTERRA_NATIVE_CONTAINER_ID) };
  }
  if (!ADSTERRA_BANNER_CONFIGURED || !ADSTERRA_BANNER_KEY || !ADSTERRA_BANNER_SCRIPT_SRC) return null;
  return {
    width: ADSTERRA_BANNER_WIDTH,
    height: ADSTERRA_BANNER_HEIGHT,
    html: buildBannerHtml(ADSTERRA_BANNER_KEY, ADSTERRA_BANNER_SCRIPT_SRC, ADSTERRA_BANNER_WIDTH, ADSTERRA_BANNER_HEIGHT),
  };
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
