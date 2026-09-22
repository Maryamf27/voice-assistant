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

