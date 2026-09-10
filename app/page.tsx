import Link from "next/link";
import { Waveform } from "@/components/ui";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-base-bg">
      <div className="pointer-events-none absolute inset-0 bg-aurora-violet" />
      <div className="pointer-events-none absolute inset-0 bg-aurora-mint" />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-5 py-20 sm:px-6">
        <p className="mb-4 text-xs font-medium uppercase tracking-[.2em] text-brand-violetSoft/90 sm:mb-5 sm:text-sm">Voice Studio</p>
        <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.1] tracking-tight text-ink-primary sm:text-6xl sm:leading-[1.05] lg:text-7xl">
          A premium studio for AI voice.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-ink-muted sm:mt-6 sm:text-lg sm:leading-8">
          A secure foundation for creating, discovering, and managing authorized voices — built for people who take audio seriously.
        </p>

        <div className="mt-8 h-12 w-full max-w-md sm:mt-10 sm:h-14">
          <Waveform seed="voice-studio-landing" bars={64} className="h-full" />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4">
          <Link href="/register" className="rounded-lg bg-brand-violet px-5 py-3 text-center font-medium text-white shadow-glowViolet transition hover:bg-brand-violetDim">
            Create account
          </Link>
          <Link href="/login" className="rounded-lg border border-base-border px-5 py-3 text-center font-medium text-ink-primary transition hover:border-brand-violet/40 hover:bg-base-card">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
