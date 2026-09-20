"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { AD_CLOSE_COOLDOWN_MS, MAX_ADS_PER_SESSION } from "./ad-config";

type AdContextValue = { isPremium: boolean; canShowAd: () => boolean; closeAd: () => void };
const AdContext = createContext<AdContextValue | null>(null);

export function AdProvider({ isPremium, children }: { isPremium: boolean; children: ReactNode }) {
  const [closedAt, setClosedAt] = useState(0);
  const [shown, setShown] = useState(0);
  const value = useMemo<AdContextValue>(() => ({
    isPremium,
    canShowAd: () => !isPremium && shown < MAX_ADS_PER_SESSION && Date.now() - closedAt >= AD_CLOSE_COOLDOWN_MS,
    closeAd: () => { setClosedAt(Date.now()); setShown((current) => current + 1); },
  }), [closedAt, isPremium, shown]);
  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
}

export function useAds() {
  const context = useContext(AdContext);
  if (!context) throw new Error("useAds must be used inside AdProvider");
  return context;
}
