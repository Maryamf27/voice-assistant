"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Script from "next/script";
import {
  ADSENSE_CLIENT_ID,
  ADSENSE_ELIGIBILITY_DELAY_MS,
  ADSENSE_SCRIPT_SRC,
  ADSENSE_SLOT_ID,
} from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * true only when (a) the server said this user should see ads and (b) the one-time eligibility
 * delay has elapsed. Defaults to false, so an AdSlot rendered outside the provider shows nothing.
 */
const AdsVisibleContext = createContext(false);

/**
 * `enabled` MUST come from the server (see app/dashboard/layout.tsx, which derives it from the
 * Supabase entitlement). It is never read from anything the browser controls.
 *
 * The timer starts once, when ads become enabled, and is only restarted if `enabled` flips. It is
 * deliberately not tied to route changes, re-renders or router.refresh(), so navigating around the
 * dashboard neither resets it nor re-triggers ads. There is no interval and no ad refresh.
 */
export function AdSenseProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => setEligible(true), ADSENSE_ELIGIBILITY_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      setEligible(false);
    };
  }, [enabled]);

  // `enabled &&` makes ads vanish in the very same render that entitlement flips to Premium.
  return <AdsVisibleContext.Provider value={enabled && eligible}>{children}</AdsVisibleContext.Provider>;
}

/**
 * A standard responsive AdSense display unit. It renders nothing (and loads nothing) for Premium
 * users, before the eligibility delay, or when AdSense is not configured.
 *
 * Place it in normal page flow with clear spacing from buttons and other controls. It must not
 * overlap or sit tight against interactive elements (AdSense policy: avoid accidental clicks).
 */
export function AdSlot({ className = "" }: { className?: string }) {
  const visible = useContext(AdsVisibleContext);
  if (!visible || !ADSENSE_CLIENT_ID || !ADSENSE_SLOT_ID || !ADSENSE_SCRIPT_SRC) return null;
  return <AdUnit className={className} clientId={ADSENSE_CLIENT_ID} slotId={ADSENSE_SLOT_ID} scriptSrc={ADSENSE_SCRIPT_SRC} />;
}

const INS_STYLE = { display: "block" } as const;

function AdUnit({
  className,
  clientId,
  slotId,
  scriptSrc,
}: {
  className: string;
  clientId: string;
  slotId: string;
  scriptSrc: string;
}) {
  // One ad request per mounted <ins>. The ref survives React StrictMode's dev-only double effect,
  // which would otherwise queue two pushes for a single element (AdSense then logs an error).
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    try {
      // Queuing before the script has finished loading is the documented, supported pattern.
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // A blocked/failed ad must never affect the app.
    }
  }, []);

  return (
    <>
      {/* Loads asynchronously and only once per document (next/script de-dupes by id). */}
      <Script id="adsense-loader" src={scriptSrc} strategy="afterInteractive" crossOrigin="anonymous" />
      {/* Label is only revealed once Google reports the unit as filled (data-ad-status), so blocked or
          unfilled units leave no empty "Advertisement" box. "Advertisement" is a label Google allows. */}
      <div className={`flex flex-col-reverse gap-1.5 ${className}`}>
        <ins
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
    </>
  );
}
