import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FishAudioError, cloneVoice, deleteVoiceModel, isProviderCreditError } from "@/lib/fish-audio";
import { MAX_DESIGN_AUDIO_BYTES, validateVoiceName } from "@/lib/validation";

type SaveInput = { name?: unknown; audioBase64?: unknown };

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  let input: SaveInput;
  try {
    input = await request.json() as SaveInput;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const nameError = validateVoiceName(input.name);
  if (nameError) {
    return NextResponse.json({ error: nameError }, { status: 400 });
  }
  const name = (input.name as string).trim();

  if (typeof input.audioBase64 !== "string" || !input.audioBase64.trim()) {
    return NextResponse.json({ error: "Select a voice candidate to save." }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(input.audioBase64, "base64");
  } catch {
    return NextResponse.json({ error: "That voice candidate is invalid." }, { status: 400 });
  }
  if (buffer.length === 0) {
    return NextResponse.json({ error: "That voice candidate is invalid." }, { status: 400 });
  }
  if (buffer.length > MAX_DESIGN_AUDIO_BYTES) {
    return NextResponse.json({ error: "That voice candidate is too large to save." }, { status: 400 });
  }

  let fishModel;
  try {
    fishModel = await cloneVoice({
      title: name,
      audio: { data: buffer, filename: "design-candidate.wav", contentType: "audio/wav" },
    });
  } catch (error) {
    if (isProviderCreditError(error)) {
      return NextResponse.json(
        {
          error: "Saving this voice is currently unavailable because the AI provider has insufficient API credits. Please try again later.",
          code: "provider_unavailable",
        },
        { status: 503 },
      );
    }
    if (error instanceof FishAudioError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Saving designed voice failed", error);
    return NextResponse.json({ error: "Unable to save this voice. Please try again." }, { status: 500 });
  }

  const { data: voice, error } = await supabase
    .from("voices")
    .insert({ user_id: user.id, name, type: "designed", fish_reference_id: fishModel.id })
    .select("id, name, type, created_at")
    .single();

  if (error || !voice) {
    console.error("Could not save designed voice", error);
    await deleteVoiceModel(fishModel.id);
    return NextResponse.json(
      { error: "The voice was created but could not be saved. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { id: voice.id, name: voice.name, type: voice.type, createdAt: voice.created_at },
    { status: 201 },
  );
}
