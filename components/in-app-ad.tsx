"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { AD_CONFIG, type AdPlacement, AD_SLOTS, pickAdSlot } from "@/lib/ad-config";
import { useIsPremium } from "@/components/subscription-provider";
import { IconSparkle } from "@/components/icons";

type InstanceState = {
  visible: boolean;
  slotSeed: number;
};

type GlobalState = {
  activePlacement: AdPlacement | null;
  activeInstanceKey: string | null;
  lastDismissedAt: number;
  lastDismissedPlacement: AdPlacement | null;
};

const PLACEMENT_PRIORITY: Record<AdPlacement, number> = {
  "clone-cloning": 10,
  "tts-generating": 9,
  "normal": 1,
};

const globalState: GlobalState = {
  activePlacement: null,
  activeInstanceKey: null,
  lastDismissedAt: 0,
  lastDismissedPlacement: null,
};

const listeners = new Set<() => void>();

function emitChange() {
  for (const fn of listeners) fn();
}

function acquirePlacement(instanceKey: string, placement: AdPlacement): boolean {
  const currentPriority = globalState.activePlacement
    ? PLACEMENT_PRIORITY[globalState.activePlacement]
    : -1;
  const incomingPriority = PLACEMENT_PRIORITY[placement];

  if (
    globalState.activeInstanceKey === null ||
    incomingPriority > currentPriority
  ) {
    globalState.activePlacement = placement;
    globalState.activeInstanceKey = instanceKey;
    emitChange();
    return true;
  }
  if (globalState.activeInstanceKey === instanceKey) {
    return true;
  }
  return false;
}

function releasePlacement(instanceKey: string, placement: AdPlacement, wasDismissed: boolean) {
  if (globalState.activeInstanceKey === instanceKey) {
    if (wasDismissed) {
      globalState.lastDismissedAt = Date.now();
      globalState.lastDismissedPlacement = placement;
    }
    globalState.activePlacement = null;
    globalState.activeInstanceKey = null;
    emitChange();
  }
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function isWithinCooldown(placement: AdPlacement): boolean {
  if (globalState.lastDismissedAt === 0) return false;
  const elapsed = Date.now() - globalState.lastDismissedAt;
  const isWaitingPlacement =
    placement === "tts-generating" || placement === "clone-cloning";
  const cooldown = isWaitingPlacement
    ? AD_CONFIG.waitingAdCloseCooldownMs
    : AD_CONFIG.normalAdCloseCooldownMs;
  return elapsed < cooldown;
}

const accentClasses: Record<
  "violet" | "mint" | "amber",
  { border: string; badgeBg: string; badgeText: string; cta: string; icon: string }
> = {
  violet: {
    border: "border-brand-violet/30",
    badgeBg: "bg-brand-violet/15",
    badgeText: "text-brand-violetSoft",
    cta: "bg-brand-violet hover:bg-brand-violetDim",
    icon: "text-brand-violetSoft",
  },
  mint: {
    border: "border-audio-mint/30",
    badgeBg: "bg-audio-mint/15",
    badgeText: "text-audio-mint",
    cta: "bg-audio-mint hover:bg-audio-mintDim text-base-bg",
    icon: "text-audio-mint",
  },
  amber: {
    border: "border-state-amber/30",
    badgeBg: "bg-state-amber/15",
    badgeText: "text-state-amber",
    cta: "bg-state-amber hover:brightness-110 text-base-bg",
    icon: "text-state-amber",
  },
};

export type InAppAdProps = {
  placement: AdPlacement;
  isOperationActive?: boolean;
  operationDelayMs?: number;
  operationRepeatMs?: number;
  enableNormalSchedule?: boolean;
  className?: string;
  dense?: boolean;
  instanceKey: string;
};

export function InAppAd({
  placement,
  isOperationActive = false,
  operationDelayMs,
  operationRepeatMs,
  enableNormalSchedule = false,
  className = "",
  dense = false,
  instanceKey,
}: InAppAdProps) {
  const isPremium = useIsPremium();
  const [, forceTick] = useState(0);
  const rerender = useCallback(() => forceTick((n) => n + 1), []);

  const [state, setState] = useState<InstanceState>({
    visible: false,
    slotSeed: 0,
  });

  const timers = useRef<Array<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>>>(
    [],
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const operationActiveRef = useRef(isOperationActive);
  operationActiveRef.current = isOperationActive;
  const placedRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    for (const t of timers.current) {
      if ((t as ReturnType<typeof setInterval>).refresh !== undefined) {
        clearInterval(t as ReturnType<typeof setInterval>);
      } else {
        clearTimeout(t as ReturnType<typeof setTimeout>);
      }
    }
    timers.current = [];
  }, []);

  const addTimer = useCallback(
    (t: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>) => {
      timers.current.push(t);
    },
    [],
  );

  const tryShow = useCallback(
    (nextSeed?: number) => {
      if (isPremium) return;
      if (placedRef.current) return;
      if (isWithinCooldown(placement)) return;
      const acquired = acquirePlacement(instanceKey, placement);
      if (!acquired) return;
      placedRef.current = true;
      setState((s) => ({
        visible: true,
        slotSeed: nextSeed !== undefined ? nextSeed : s.slotSeed,
      }));
    },
    [isPremium, instanceKey, placement],
  );

  const hide = useCallback(
    (dismissed: boolean) => {
      releasePlacement(instanceKey, placement, dismissed);
      placedRef.current = false;
      setState((s) => ({ ...s, visible: false }));
    },
    [instanceKey, placement],
  );

  const handleClose = useCallback(() => {
    hide(true);
  }, [hide]);

  const scheduleNormal = useCallback(() => {
    if (!enableNormalSchedule || isPremium) return;
    clearAllTimers();

    const runInitial = () => {
      const t = setTimeout(() => {
        if (placement === "normal" && !operationActiveRef.current) {
          tryShow(Math.floor(Math.random() * 1000));
        }
        const intervalT = setInterval(() => {
          if (!placedRef.current && !operationActiveRef.current) {
            if (placement === "normal") {
              tryShow(Math.floor(Math.random() * 1000));
            }
          }
        }, AD_CONFIG.normalIntervalMs);
        addTimer(intervalT);
      }, AD_CONFIG.normalInitialDelayMs);
      addTimer(t);
    };
    runInitial();
  }, [enableNormalSchedule, isPremium, placement, tryShow, addTimer, clearAllTimers, operationActiveRef]);

  const scheduleOperation = useCallback(() => {
    if (isPremium) return;
    const delay =
      operationDelayMs ??
      (placement === "tts-generating"
        ? AD_CONFIG.ttsGenerationDelayMs
        : AD_CONFIG.cloneGenerationDelayMs);
    const repeat = operationRepeatMs ?? AD_CONFIG.operationRepeatIntervalMs;

    clearAllTimers();

    const attemptShow = () => {
      if (operationActiveRef.current) {
        tryShow(Math.floor(Math.random() * 1000));
      }
    };

    const t = setTimeout(attemptShow, delay);
    addTimer(t);

    const repeatT = setInterval(() => {
      if (operationActiveRef.current && !placedRef.current && !isWithinCooldown(placement)) {
        tryShow(Math.floor(Math.random() * 1000));
      }
    }, repeat);
    addTimer(repeatT);
  }, [
    isPremium,
    operationDelayMs,
    operationRepeatMs,
    placement,
    tryShow,
    addTimer,
    clearAllTimers,
    operationActiveRef,
  ]);

  useEffect(() => {
    const unsub = subscribe(rerender);
    return () => {
      unsub();
    };
  }, [rerender]);

  useEffect(() => {
    if (isPremium) {
      clearAllTimers();
      hide(false);
      return;
    }

    if (isOperationActive) {
      scheduleOperation();
    } else if (enableNormalSchedule && placement === "normal") {
      scheduleNormal();
    } else {
      clearAllTimers();
    }

    return () => {
      clearAllTimers();
    };
  }, [
    isPremium,
    isOperationActive,
    enableNormalSchedule,
    placement,
    scheduleOperation,
    scheduleNormal,
    clearAllTimers,
    hide,
  ]);

  useEffect(() => {
    if (!isOperationActive && stateRef.current.visible && placement !== "normal") {
      hide(false);
    }
  }, [isOperationActive, placement, hide]);

  useEffect(() => {
    return () => {
      clearAllTimers();
      hide(false);
    };
  }, [clearAllTimers, hide]);

  const isActuallyActive =
    state.visible && globalState.activeInstanceKey === instanceKey;

  const slot = useMemo(() => pickAdSlot(state.slotSeed), [state.slotSeed]);

  if (isPremium) return null;
  if (!isActuallyActive) return null;

  const accent = accentClasses[slot.accent];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${accent.border} bg-base-card/95 shadow-panel animate-fade-up ${className}`}
      role="region"
      aria-label="Sponsored message"
      data-ad-placement={placement}
    >
      <div
        className={`absolute inset-0 ${
          slot.accent === "violet"
            ? "bg-aurora-violet"
            : slot.accent === "mint"
            ? "bg-aurora-mint"
            : "bg-aurora-violet opacity-60"
        } opacity-70`}
      />
      <div className="relative">
        {!dense && (
          <div className="flex items-start justify-between gap-3 px-4 pt-3">
            {slot.badge && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${accent.badgeBg} ${accent.badgeText}`}
              >
                <IconSparkle className="h-3 w-3" />
                {slot.badge}
              </span>
            )}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close message"
              className="group -mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-faint transition hover:bg-base-surface hover:text-ink-primary"
            >
              <svg
                viewBox="0 0 20 20"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>
        )}
        <div className={`flex items-start gap-3 ${dense ? "px-3 py-3" : "px-4 pb-4 pt-3"}`}>
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-base-border bg-base-surface ${accent.icon}`}
          >
            <IconSparkle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`font-medium ${dense ? "text-sm" : "text-base"} text-ink-primary`}>
              {slot.title}
            </p>
            {!dense && (
              <p className="mt-1 text-xs leading-5 text-ink-muted">{slot.description}</p>
            )}
            <Link
              href="/dashboard/premium"
              className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition ${accent.cta}`}
            >
              {slot.cta}
              <svg
                viewBox="0 0 20 20"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M7 4l6 6-6 6" />
              </svg>
            </Link>
          </div>
          {dense && (
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close message"
              className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-faint transition hover:bg-base-surface hover:text-ink-primary"
            >
              <svg
                viewBox="0 0 20 20"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
