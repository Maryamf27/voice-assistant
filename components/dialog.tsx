"use client";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { IconAlert, IconClose } from "@/components/icons";

/**
 * A small, dependency-free modal dialog used in place of window.confirm().
 * - Renders in a portal so it always sits above app content, at any viewport size.
 * - Traps focus, closes on Escape / backdrop click, and restores focus on close.
 * - Sized to be comfortable on phones (full-width with margin) up to desktop (fixed max width).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  destructive = true,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="glass relative w-full max-w-sm rounded-2xl border border-base-border p-5 shadow-panel animate-fade-up sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${destructive ? "bg-state-rose/15 text-state-rose" : "bg-brand-violet/15 text-brand-violetSoft"}`}>
            <IconAlert className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold text-ink-primary">{title}</h2>
            <p id={descId} className="mt-1.5 text-sm leading-6 text-ink-muted">{description}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-ink-faint transition hover:bg-base-surface hover:text-ink-primary"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full rounded-lg border border-base-border px-4 py-2.5 text-sm font-medium text-ink-muted transition hover:border-ink-faint/40 hover:text-ink-primary disabled:opacity-60 sm:w-auto"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-glowViolet transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
              destructive ? "bg-state-rose hover:bg-state-rose/85" : "bg-brand-violet hover:bg-brand-violetDim"
            }`}
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
