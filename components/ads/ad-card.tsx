"use client";

import { IconCheck, IconClose } from "@/components/icons";
import { AD_COPY, type AdPlacement } from "./ad-config";

export function AdCard({ placement, onClose }: { placement: AdPlacement; onClose: () => void }) {
  const copy = AD_COPY[placement];
  return (
    <aside className="relative overflow-hidden rounded-xl border border-brand-violet/25 bg-gradient-to-br from-brand-violet/10 via-base-card to-audio-mint/[0.06] p-5" aria-label="Advertisement">
      <button type="button" onClick={onClose} aria-label="Close advertisement" className="absolute right-3 top-3 rounded-md p-1.5 text-ink-faint transition hover:bg-base-surface hover:text-ink-primary">
        <IconClose className="h-4 w-4" />
      </button>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-violetSoft">{copy.eyebrow}</p>
      <div className="mt-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-audio-mint/10 text-audio-mint"><IconCheck className="h-4 w-4" /></div>
        <div><h2 className="pr-7 text-sm font-semibold text-ink-primary">{copy.title}</h2><p className="mt-1 max-w-lg text-xs leading-5 text-ink-muted">{copy.body}</p></div>
      </div>
      <p className="mt-4 text-xs font-medium text-brand-violetSoft">{copy.action}</p>
    </aside>
  );
}
