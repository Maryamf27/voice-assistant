"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { LogoutButton } from "@/components/logout-button";
import { IconHome, IconWaveform, IconMic, IconSparkle, IconLibrary, IconVoices, IconClock, IconMenu, IconClose } from "@/components/icons";

const sections: { label: string; links: { label: string; href: string; icon: (p: { className?: string }) => ReactElement }[] }[] = [
  {
    label: "Create",
    links: [
      { label: "Text to Speech", href: "/dashboard/tts", icon: IconWaveform },
      { label: "Voice Cloning", href: "/dashboard/clone", icon: IconMic },
      { label: "Voice Design", href: "/dashboard/design", icon: IconSparkle },
    ],
  },
  {
    label: "Explore",
    links: [{ label: "Voice Library", href: "/dashboard/library", icon: IconLibrary }],
  },
  {
    label: "Workspace",
    links: [
      { label: "My Voices", href: "/dashboard/voices", icon: IconVoices },
      { label: "History", href: "/dashboard/history", icon: IconClock },
    ],
  },
];

function Navigation({ path, onNavigate }: { path: string; onNavigate: () => void }) {
  return (
    <nav className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
            path === "/dashboard" ? "bg-brand-violet/15 font-medium text-brand-violetSoft" : "text-ink-muted hover:bg-base-surface hover:text-ink-primary"
          }`}
        >
          <IconHome className="h-4 w-4" />
          Dashboard
        </Link>
      </div>
      {sections.map((section) => (
        <div key={section.label}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[.14em] text-ink-faint">{section.label}</p>
          <div className="mt-2 space-y-1">
            {section.links.map((link) => {
              const active = path === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    active ? "bg-brand-violet/15 font-medium text-brand-violetSoft" : "text-ink-muted hover:bg-base-surface hover:text-ink-primary"
                  }`}
                >
                  {active && <span className="absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-full bg-brand-violet" />}
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-brand-violet" : "text-ink-faint group-hover:text-ink-muted"}`} />
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="mb-8 flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-violet to-audio-mint text-white shadow-glowViolet">
        <span className="flex h-3.5 items-end gap-[2px]">
          <span className="w-[2.5px] h-[40%] rounded-full bg-white/90" />
          <span className="w-[2.5px] h-full rounded-full bg-white/90" />
          <span className="w-[2.5px] h-[65%] rounded-full bg-white/90" />
        </span>
      </span>
      <span className="font-display font-semibold tracking-tight text-ink-primary">Voice Studio</span>
    </Link>
  );
}

/** Slide-in navigation drawer for phones/tablets — portal-rendered, with scroll lock,
 *  Escape-to-close, focus management, and it closes itself the moment the route changes. */
function MobileDrawer({ open, path, onClose }: { open: boolean; path: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  // Mount once on the client so createPortal has document.body to target.
  useEffect(() => { setMounted(true); }, []);

  // Close automatically whenever the route changes (covers link taps and back/forward nav).
  useEffect(() => { onClose(); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
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
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`glass absolute inset-y-0 left-0 flex h-full w-[min(18rem,85vw)] flex-col border-r border-base-border p-5 shadow-panel transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Brand />
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close navigation" className="rounded-lg p-2 text-ink-muted hover:bg-base-surface hover:text-ink-primary">
            <IconClose className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 flex-1 overflow-y-auto overscroll-contain">
          <Navigation path={path} onNavigate={onClose} />
        </div>
        <div className="mt-auto border-t border-base-border pt-4">
          <LogoutButton />
        </div>
      </aside>
    </div>,
    document.body
  );
}

export function DashboardSidebar({ mobileOnly = false }: { mobileOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  if (mobileOnly) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="rounded-lg border border-base-border p-2 text-ink-muted transition hover:border-brand-violet/40 hover:text-ink-primary md:hidden"
        >
          <IconMenu className="h-5 w-5" />
        </button>
        <MobileDrawer open={open} path={path} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <aside className="hidden w-64 shrink-0 border-r border-base-border bg-base-bg/95 p-5 md:flex md:flex-col">
      <Brand />
      <div className="flex-1 overflow-y-auto">
        <Navigation path={path} onNavigate={() => {}} />
      </div>
      <div className="mt-auto border-t border-base-border pt-4">
        <LogoutButton />
      </div>
    </aside>
  );
}
