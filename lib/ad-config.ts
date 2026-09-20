export const AD_CONFIG = {
  normalInitialDelayMs: 15000,
  normalIntervalMs: 45000,

  ttsGenerationDelayMs: 2500,
  cloneGenerationDelayMs: 2500,

  operationRepeatIntervalMs: 15000,

  waitingAdCloseCooldownMs: 10000,
  normalAdCloseCooldownMs: 45000,
} as const;

export type AdPlacement = "normal" | "tts-generating" | "clone-cloning";

export type AdSlot = {
  id: string;
  title: string;
  description: string;
  cta: string;
  accent: "violet" | "mint" | "amber";
  badge?: string;
};

export const AD_SLOTS: AdSlot[] = [
  {
    id: "premium-unlock-1",
    title: "Upgrade to Premium",
    description: "Unlimited generations, full voice library access, and priority rendering.",
    cta: "See Premium plans",
    accent: "violet",
    badge: "Free user",
  },
  {
    id: "clone-more-1",
    title: "Clone unlimited voices",
    description: "Premium members can create and save as many personal voices as they need.",
    cta: "Upgrade now",
    accent: "mint",
  },
  {
    id: "priority-1",
    title: "Faster generations",
    description: "Premium uses priority rendering queues. No waiting, even at peak times.",
    cta: "Go Premium",
    accent: "amber",
    badge: "Priority",
  },
  {
    id: "library-full-1",
    title: "Full Voice Library",
    description: "Unlock every authorized voice in the library with a Premium subscription.",
    cta: "Explore Premium",
    accent: "violet",
  },
];

export function pickAdSlot(seed: number): AdSlot {
  const safeSeed = Math.max(0, Math.floor(seed));
  return AD_SLOTS[safeSeed % AD_SLOTS.length];
}
