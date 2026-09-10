"use client";
import { useEffect, useId, useRef, useState } from "react";
import { IconCheck, IconChevronDown } from "@/components/icons";

export type SelectOption = { value: string; label: string };

/**
 * A fully custom dropdown that replaces the native <select>.
 *
 * Native <select> popups are rendered by the OS/browser, not by our CSS — that's
 * why they showed up light-themed with a default blue highlight instead of matching
 * the app, and why the popup could butt right up against (or spill past) the edge
 * of the screen on mobile. This component renders its own listbox as a normal,
 * absolutely-positioned block inside the trigger's own container, so it always
 * inherits the app's dark theme and always stays clear of the viewport edge —
 * it's just as constrained by the page's padding as any other element.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  className = "",
  id,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function commit(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
    }
    if (!open) return;

    switch (event.key) {
      case "ArrowDown":
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        commit(activeIndex);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-base-border bg-base-bg px-3 py-2.5 text-left text-base text-ink-primary outline-none transition focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
      >
        <span className={`truncate ${selected ? "" : "text-ink-faint"}`}>{selected ? selected.label : placeholder}</span>
        <IconChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={`${listboxId}-${activeIndex}`}
          className="glass absolute left-0 right-0 z-30 mt-1.5 max-h-60 overflow-y-auto overscroll-contain rounded-lg border border-base-border p-1 shadow-panel animate-fade-up"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <li
                key={option.value}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(index)}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm transition ${
                  isActive ? "bg-brand-violet/15 text-brand-violetSoft" : "text-ink-muted"
                } ${isSelected && !isActive ? "text-ink-primary" : ""}`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <IconCheck className="h-3.5 w-3.5 shrink-0 text-brand-violetSoft" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
