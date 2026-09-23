import { TtsForm } from "@/components/studio-forms";
import { PageIntro } from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getTTSAccess, getTTSCharacterLimit } from "@/lib/entitlements";

export type TtsVoiceOption = { id: string; name: string; type: string };

export default async function TtsPage({ searchParams }: { searchParams: Promise<{ voice?: string }> }) {
  const supabase = await createSupabaseServerClient();
  // getCurrentUser() is wrapped in React's cache() (lib/auth.ts) and is already
  // called once by the dashboard layout for this same request — using it here
  // instead of a second supabase.auth.getUser() call avoids an extra network
  // round trip to Supabase on every visit to this page.
  const user = await getCurrentUser();
  const { voice: requestedVoiceId } = await searchParams;
  let voices: TtsVoiceOption[] = [];

  if (user) {
    const { data: docs, error } = await supabase
      .from("voices")
      .select("id, name, type")
      .eq("user_id", user.id)
      .not("fish_reference_id", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load voices for Text to Speech", error);
    } else {
      voices = (docs ?? []).map((doc) => ({ id: doc.id, name: doc.name, type: doc.type }));
    }
  }

  const model = process.env.FISH_TTS_MODEL ?? null;
  const access = user ? await getTTSAccess(user.id) : { plan: "free" as const, isPremium: false };
  const initialVoiceId = requestedVoiceId && voices.some((voice) => voice.id === requestedVoiceId) ? requestedVoiceId : "";

  return (
    <>
      <PageIntro
        eyebrow="Create"
        title="Text to Speech"
        description="Write your script, select a voice, and generate audio."
      />
      <TtsForm voices={voices} model={model} initialVoiceId={initialVoiceId} characterLimit={getTTSCharacterLimit(access.plan)} userId={user?.id ?? null} />
    </>
  );
}
