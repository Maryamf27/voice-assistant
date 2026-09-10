import Link from "next/link";
import type { ReactNode } from "react";
import { IconAlert, IconArrowRight, IconSparkle } from "@/components/icons";

export function PageIntro({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-base-border/70 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="text-xs font-medium uppercase tracking-[.16em] text-brand-violetSoft/80">{eyebrow}</p>}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-primary sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-base-border bg-base-card/90 shadow-panel ${className}`}>
      {children}
    </section>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: { label: string; href: string } }) {
  return (
    <Card className="glass relative flex min-h-64 flex-col items-center justify-center overflow-hidden px-6 py-14 text-center">
      <div className="pointer-events-none absolute inset-0 bg-aurora-violet" />
      <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-base-border bg-base-surface text-brand-violetSoft">
        <IconSparkle className="h-5 w-5" />
      </div>
      <h2 className="relative mt-4 text-base font-medium text-ink-primary">{title}</h2>
      <p className="relative mt-2 max-w-sm text-sm leading-6 text-ink-muted">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="relative mt-6 inline-flex items-center gap-1.5 rounded-lg bg-brand-violet px-4 py-2.5 text-sm font-medium text-white shadow-glowViolet transition hover:bg-brand-violetDim"
        >
          {action.label}
          <IconArrowRight className="h-4 w-4" />
        </Link>
      )}
    </Card>
  );
}

export function StatCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink-muted">{label}</p>
        {icon && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-violet/10 text-brand-violetSoft">{icon}</div>}
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-ink-primary">{value}</p>
      <p className="mt-2 text-xs text-ink-faint">{detail}</p>
    </Card>
  );
}

export function QuickActionCard({ title, description, href, icon }: { title: string; description: string; href: string; icon: ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-base-border bg-base-card/90 p-5 shadow-panel transition duration-200 hover:-translate-y-0.5 hover:border-brand-violet/50 hover:shadow-glowViolet"
    >
      <div className="pointer-events-none absolute inset-0 bg-aurora-violet opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-base-border bg-base-surface text-brand-violetSoft transition group-hover:border-brand-violet/50 group-hover:text-brand-violet">
        {icon}
      </div>
      <h2 className="relative mt-5 font-medium text-ink-primary">{title}</h2>
      <p className="relative mt-1.5 text-sm leading-6 text-ink-muted">{description}</p>
      <p className="relative mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-violetSoft">
        Open workspace <IconArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </p>
    </Link>
  );
}

const statusStyles: Record<string, { pill: string; dot: string }> = {
  pending: { pill: "bg-state-amber/10 text-state-amber", dot: "bg-state-amber" },
  processing: { pill: "bg-brand-violet/10 text-brand-violetSoft", dot: "bg-brand-violet animate-pulse" },
  completed: { pill: "bg-audio-mint/10 text-audio-mint", dot: "bg-audio-mint" },
  failed: { pill: "bg-state-rose/10 text-state-rose", dot: "bg-state-rose" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] ?? { pill: "bg-base-surface text-ink-muted", dot: "bg-ink-faint" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${style.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}

export function ProviderUnavailableNotice({ message }: { message: string }) {
  return (
    <div role="alert" className="mt-3 flex items-start gap-3 rounded-xl border border-state-amber/25 bg-state-amber/[0.07] p-4">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-state-amber/15 text-state-amber">
        <IconAlert className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-medium text-state-amber">AI provider temporarily unavailable</p>
        <p className="mt-1 text-sm leading-6 text-state-amber/75">{message}</p>
      </div>
    </div>
  );
}

/** Animated equalizer bars — used in-place of plain "Loading…" text throughout the studio. */
export function Equalizer({ label, size = "md" }: { label?: string; size?: "sm" | "md" }) {
  const heights = size === "sm" ? ["40%", "70%", "100%", "55%", "80%"] : ["35%", "65%", "100%", "50%", "85%"];
  const anims = ["animate-eq3", "animate-eq1", "animate-eq5", "animate-eq2", "animate-eq4"];
  const barWidth = size === "sm" ? "w-[3px]" : "w-1";
  const boxH = size === "sm" ? "h-3.5" : "h-4.5";
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`flex items-end gap-[3px] ${boxH === "h-4.5" ? "h-[18px]" : "h-3.5"}`}>
        {heights.map((h, i) => (
          <span
            key={i}
            className={`${barWidth} origin-bottom rounded-full bg-brand-violet ${anims[i]}`}
            style={{ height: h }}
          />
        ))}
      </span>
      {label && <span className="text-sm text-ink-muted">{label}</span>}
    </span>
  );
}

/** Deterministic decorative waveform bars, seeded from a string so heights stay stable across renders. */
export function Waveform({ seed, bars = 40, className = "", active = false }: { seed: string; bars?: number; className?: string; active?: boolean }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const values: number[] = [];
  for (let i = 0; i < bars; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const pct = 18 + (h % 82);
    values.push(pct);
  }
  return (
    <span className={`flex h-full items-center gap-[2.5px] ${className}`} aria-hidden="true">
      {values.map((v, i) => (
        <span
          key={i}
          className={`w-[2.5px] shrink-0 rounded-full ${active ? "bg-audio-mint" : "bg-brand-violet/60"}`}
          style={{ height: `${v}%` }}
        />
      ))}
    </span>
  );
}

export function IconTile({ children, tone = "violet" }: { children: ReactNode; tone?: "violet" | "mint" }) {
  const toneClass = tone === "mint" ? "border-audio-mint/30 bg-audio-mint/10 text-audio-mint" : "border-brand-violet/30 bg-brand-violet/10 text-brand-violetSoft";
  return <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${toneClass}`}>{children}</div>;
}
