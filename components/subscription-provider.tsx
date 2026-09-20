"use client";

import { createContext, useContext, type ReactNode } from "react";

type SubscriptionContextValue = {
  isPremium: boolean;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({
  isPremium,
  children,
}: {
  isPremium: boolean;
  children: ReactNode;
}) {
  return (
    <SubscriptionContext.Provider value={{ isPremium }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useIsPremium(): boolean {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) return false;
  return ctx.isPremium;
}
