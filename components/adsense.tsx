"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  ADSENSE_CLIENT_ID,
  ADSENSE_CONFIGURED,
  ADSENSE_ELIGIBILITY_DELAY_MS,
  ADSENSE_SCRIPT_SRC,
  ADSENSE_SLOT_ID,
} from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const AdsVisibleContext = createContext(false);

/**
 * Controls when Free users become eligible for ads.
 *
 * The timer runs once when `enabled` becomes true.
 * It is not restarted by route changes or re-renders.
 */
export function AdSenseProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    const scriptSrc = ADSENSE_SCRIPT_SRC;
    if (!enabled || !ADSENSE_CONFIGURED || !scriptSrc) return;

    const timer = window.setTimeout(() => {
      const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);

      if (!existingScript) {
        const script = document.createElement("script");
        script.async = true;
        script.src = scriptSrc;
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
      }

      setEligible(true);
    }, ADSENSE_ELIGIBILITY_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [enabled]);

  return (
    <AdsVisibleContext.Provider value={enabled && eligible}>
      {children}
    </AdsVisibleContext.Provider>
  );
}

/**
 * Individual Google AdSense display unit.
 *
 * Important:
 * - The loader is injected only after the Free-user eligibility delay.
 * - This component only creates the explicit <ins> slot.
 * - Each slot is initialized once.
 */
export function AdSlot({ className = "" }: { className?: string }) {
  const visible = useContext(AdsVisibleContext);

  if (
    !visible ||
    !ADSENSE_CONFIGURED ||
    !ADSENSE_CLIENT_ID ||
    !ADSENSE_SLOT_ID
  ) {
    return null;
  }

  return (
    <AdUnit
      className={className}
      clientId={ADSENSE_CLIENT_ID}
      slotId={ADSENSE_SLOT_ID}
    />
  );
}

const INS_STYLE = {
  display: "block",
} as const;

function AdUnit({
  className,
  clientId,
  slotId,
}: {
  className: string;
  clientId: string;
  slotId: string;
}) {
  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    const ins = insRef.current;

    if (!ins) return;

    // Prevent this exact DOM element from being initialized more than once.
    if (ins.dataset.adInitialized === "true") {
      return;
    }

    // Mark it BEFORE calling push().
    // This prevents duplicate initialization if React runs effects again.
    ins.dataset.adInitialized = "true";

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch (error) {
      // AdSense failure must never break the application.
      console.warn("[adsense] Failed to initialize ad slot.", error);

      // Allow a future mount to retry with a new <ins>.
      delete ins.dataset.adInitialized;
    }
  }, []);

  return (
    <div className={`flex flex-col-reverse gap-1.5 ${className}`}>
      <ins
        ref={insRef}
        className="adsbygoogle peer"
        style={INS_STYLE}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="false"
      />

      <p className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint peer-data-[ad-status=filled]:block">
        Advertisement
      </p>
    </div>
  );
}
