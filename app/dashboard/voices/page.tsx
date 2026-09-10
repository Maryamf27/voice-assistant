import type { ReactElement } from "react";
import { PageIntro, Card, EmptyState, Waveform, IconTile } from "@/components/ui";
import { VoiceCardActions } from "@/components/voice-card-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { VoiceType } from "@/lib/supabase/types";
import { IconMic, IconSparkle, IconLibrary } from "@/components/icons";

type VoiceItem = { id: string; name: string; type: VoiceType; fish_reference_id: string | null; created_at: string };

const typeMeta: Record<string, { label: string; icon: (p: { className?: string }) => ReactElement; tone: "violet" | "mint" }> = {
  personal: { label: "Personal", icon: IconMic, tone: "violet" },
  designed: { label: "Designed", icon: IconSparkle, tone: "violet" },
  library: { label: "Library", icon: IconLibrary, tone: "mint" },
};

export default async function VoicesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Ownership is enforced here (and again by RLS): only voices belonging to
  // the authenticated user are ever returned.
  const { data: voices, error } = await supabase
    .from("voices")
    .select("id, name, type, fish_reference_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<VoiceItem[]>();

  if (error) {
    console.error("Could not load voices", error);
    return (
      <>
        <PageIntro eyebrow="Library" title="My voices" description="Personal, designed, and authorized library voices in one place." />
        <Card className="p-6 text-sm text-state-amber">Your voices are temporarily unavailable. Please try again shortly.</Card>
      </>
    );
  }

  if (!voices || voices.length === 0) {
    return (
      <>
        <PageIntro eyebrow="Library" title="My voices" description="Personal, designed, and authorized library voices in one place." />
        <EmptyState title="No saved voices yet" description="Clone a personal voice to see it here, ready to reuse in Text to Speech." action={{ label: "Clone a voice", href: "/dashboard/clone" }} />
      </>
    );
  }

  return (
    <>
      <PageIntro eyebrow="Library" title="My voices" description="Personal, designed, and authorized library voices in one place." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {voices.map((voice) => {
          const meta = typeMeta[voice.type] ?? typeMeta.personal;
          const Icon = meta.icon;
          return (
            <Card key={voice.id} className="p-5 transition hover:border-brand-violet/25">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <IconTile tone={meta.tone}>
                    <Icon className="h-4 w-4" />
                  </IconTile>
                  <div>
                    <p className="font-medium text-ink-primary">{voice.name}</p>
                    <p className="mt-1 text-xs capitalize text-ink-faint">{meta.label} voice</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs capitalize ${meta.tone === "mint" ? "bg-audio-mint/10 text-audio-mint" : "bg-brand-violet/10 text-brand-violetSoft"}`}>
                  {meta.label}
                </span>
              </div>
              <div className="mt-4 h-7 opacity-70">
                <Waveform seed={voice.id} bars={28} className="h-full" />
              </div>
              <p className="mt-3 text-xs text-ink-faint">Added {new Date(voice.created_at).toLocaleDateString()}</p>
              <VoiceCardActions voiceId={voice.id} readyForTts={Boolean(voice.fish_reference_id)} />
            </Card>
          );
        })}
      </div>
    </>
  );
}
