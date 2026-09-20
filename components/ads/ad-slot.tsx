"use client";

import { useEffect, useState } from "react";
import { AdCard } from "./ad-card";
import { WAITING_AD_DELAY_MS, type AdPlacement } from "./ad-config";
import { useAds } from "./ad-provider";

export function AdSlot({ placement, active = true }: { placement: AdPlacement; active?: boolean }) {
  const { isPremium, canShowAd, closeAd } = useAds();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isPremium || !active || !canShowAd()) return;
    const delay = placement === "generation-waiting" ? WAITING_AD_DELAY_MS : 0;
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [active, canShowAd, isPremium, placement]);

  if (isPremium || !visible) return null;
  return <AdCard placement={placement} onClose={() => { setVisible(false); closeAd(); }} />;
}
