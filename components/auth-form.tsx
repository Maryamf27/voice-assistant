"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { IconAlert, IconCheck, IconWaveform, IconEye, IconEyeOff } from "@/components/icons";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const isRegister = mode === "register";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    if (isRegister && body.password !== body.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data: { error?: string; email?: string } = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      if (isRegister) {
        setConfirmationEmail(String(data.email ?? body.email));
        return;
      }
      window.location.assign("/dashboard");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (confirmationEmail) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base-bg px-4">
        <div className="pointer-events-none absolute inset-0 bg-aurora-violet" />
        <div className="pointer-events-none absolute inset-0 bg-aurora-mint" />
        <section className="glass relative w-full max-w-md rounded-2xl border border-base-border p-8 text-center shadow-panel sm:p-10" role="status" aria-live="polite">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-audio-mint/30 bg-audio-mint/10 text-audio-mint shadow-[0_0_28px_rgba(100,225,190,0.16)]">
            <IconCheck className="h-8 w-8" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-audio-mint">Account created</p>
          <h1 className="mt-3 font-display text-2xl font-semibold text-ink-primary">Congratulations</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-ink-muted">
            We sent a confirmation email to <span className="font-medium text-ink-primary">{confirmationEmail}</span>. Confirm your email, then sign in to continue.
          </p>
          <Link href="/login" className="mt-7 inline-flex w-full items-center justify-center rounded-lg bg-brand-violet px-4 py-2.5 font-medium text-white shadow-glowViolet transition hover:bg-brand-violetDim">
            Go to sign in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base-bg px-4">
      <div className="pointer-events-none absolute inset-0 bg-aurora-violet" />
      <div className="pointer-events-none absolute inset-0 bg-aurora-mint" />
      <section className="glass relative w-full max-w-md rounded-2xl border border-base-border p-7 shadow-panel sm:p-9">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-brand-violetSoft">
          <IconWaveform className="h-4 w-4" />
          VOICE STUDIO
        </Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-ink-primary">{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-2 text-sm text-ink-muted">{isRegister ? "Start building your voice workspace." : "Sign in to continue to your workspace."}</p>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          {isRegister && <Field label="Name" name="name" autoComplete="name" />}
          <Field label="Email" name="email" type="email" autoComplete="email" />
          <PasswordField label="Password" name="password" autoComplete={isRegister ? "new-password" : "current-password"} />
          {isRegister && <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" />}
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-state-rose/25 bg-state-rose/10 px-3 py-2 text-sm text-state-rose">
              <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
          <button
            disabled={loading}
            className="w-full rounded-lg bg-brand-violet px-4 py-2.5 font-medium text-white shadow-glowViolet transition hover:bg-brand-violetDim disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-ink-muted">
          {isRegister ? "Already have an account?" : "New to Voice Studio?"}{" "}
          <Link className="font-medium text-brand-violetSoft hover:text-brand-violet" href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Sign in" : "Create one"}
          </Link>
        </p>
      </section>
    </main>
  );
}

function Field({ label, name, type = "text", autoComplete }: { label: string; name: string; type?: string; autoComplete: string }) {
  return (
    <label className="block text-sm font-medium text-ink-primary/90">
      {label}
      <input className="mt-1.5" name={name} type={type} autoComplete={autoComplete} required minLength={name.includes("password") ? 8 : undefined} />
    </label>
  );
}

function PasswordField({ label, name, autoComplete }: { label: string; name: string; autoComplete: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block text-sm font-medium text-ink-primary/90">
      {label}
      <div className="relative mt-1.5">
        <input
          className="pr-10"
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint transition hover:text-ink-primary"
        >
          {visible ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}
