import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FishAudioError, generateSpeech, isProviderCreditError } from "@/lib/fish-audio";
import { StorageError, getAudioUrl, uploadAudio } from "@/lib/storage";

const MAX_TEXT_LENGTH = 5000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TtsInput = { text?: unknown; voiceId?: unknown; model?: unknown };

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  let generationId: string | null = null;

  try {
    const input = (await request.json()) as TtsInput;

    if (typeof input.text !== "string" || !input.text.trim()) {
      return NextResponse.json({ error: "Enter text to generate speech." }, { status: 400 });
    }
    const text = input.text.trim();
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text must be ${MAX_TEXT_LENGTH.toLocaleString()} characters or fewer.` },
        { status: 400 },
      );
    }

    if (input.voiceId !== undefined && (typeof input.voiceId !== "string" || !UUID_PATTERN.test(input.voiceId))) {
      return NextResponse.json({ error: "The selected voice is invalid." }, { status: 400 });
    }

    const configuredModel = process.env.FISH_TTS_MODEL;
    if (!configuredModel) {
      return NextResponse.json({ error: "Text-to-speech is not configured on this server." }, { status: 500 });
    }
    if (input.model !== undefined && input.model !== configuredModel) {
      return NextResponse.json({ error: "The selected model is not available." }, { status: 400 });
    }

    let voice: { id: string; name: string; fish_reference_id: string | null } | null = null;
    if (typeof input.voiceId === "string") {
      const { data, error } = await supabase
        .from("voices")
        .select("id, name, fish_reference_id")
        .eq("id", input.voiceId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return NextResponse.json({ error: "That voice is unavailable." }, { status: 404 });
      }
      if (!data.fish_reference_id) {
        return NextResponse.json({ error: "That voice is not ready for text-to-speech." }, { status: 400 });
      }
      voice = data;
    }

    const { data: generation, error: createError } = await supabase
      .from("generations")
      .insert({
        user_id: user.id,
        type: "tts",
        input: text,
        voice_id: voice?.id ?? null,
        voice_name: voice?.name ?? null,
        model: configuredModel,
        status: "processing",
      })
      .select("id")
      .single();
    if (createError || !generation) throw createError ?? new Error("Could not create generation record.");
    generationId = generation.id;

    const result = await generateSpeech({ text, model: configuredModel, referenceId: voice?.fish_reference_id ?? undefined });

    let stored;
    try {
      stored = await uploadAudio({ supabase, userId: user.id, generationId, data: result.audio, contentType: result.contentType });
    } catch (error) {
      await supabase.from("generations").update({ status: "failed" }).eq("id", generationId);
      if (error instanceof StorageError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }

    const audioUrl = await getAudioUrl(supabase, stored.path);
    if (!audioUrl) {
      await supabase.from("generations").update({ status: "failed" }).eq("id", generationId);
      return NextResponse.json({ error: "The generated audio could not be saved. Please try again." }, { status: 502 });
    }

    const { data: updated } = await supabase
      .from("generations")
      .update({ status: "completed", audio_url: stored.path })
      .eq("id", generationId)
      .select("type, input, voice_name, model, status, created_at")
      .single();

    return NextResponse.json(
      {
        id: generationId,
        type: updated?.type,
        text: updated?.input,
        voiceName: updated?.voice_name ?? null,
        model: updated?.model ?? null,
        status: updated?.status,
        audioUrl,
        createdAt: updated?.created_at,
      },
      { status: 201 },
    );
  } catch (error) {
    if (generationId) {
      try {
        await supabase.from("generations").update({ status: "failed" }).eq("id", generationId);
      } catch (updateError) {
        console.error("Could not mark generation failed", updateError);
      }
    }

    if (isProviderCreditError(error)) {
      return NextResponse.json(
        {
          error: "Text to Speech is currently unavailable because the AI provider has insufficient API credits. Please try again later.",
          code: "provider_unavailable",
        },
        { status: 503 },
      );
    }
    if (error instanceof FishAudioError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof StorageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("TTS request failed", error);
    return NextResponse.json({ error: "Unable to generate speech. Please try again." }, { status: 500 });
  }
}
