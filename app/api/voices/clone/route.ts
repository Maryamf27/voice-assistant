import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FishAudioError, cloneVoice, deleteVoiceModel, isProviderCreditError, type CloneVoiceResult } from "@/lib/fish-audio";
import { validateCloneAudioFile, validateVoiceName } from "@/lib/validation";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  }

  const rawName = form.get("name");
  const nameError = validateVoiceName(rawName);
  if (nameError) {
    return NextResponse.json({ error: nameError }, { status: 400 });
  }
  const name = (rawName as string).trim();

  const audioFile = form.get("audio");
  const audioError = validateCloneAudioFile(audioFile);
  if (audioError) {
    return NextResponse.json({ error: audioError }, { status: 400 });
  }
  const file = audioFile as File;

  // Send the sample to Fish Audio first. We only ever create a Voice record
  // once a real model has been trained — never a placeholder / fake reference.
  let fishModel: CloneVoiceResult;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    fishModel = await cloneVoice({
      title: name,
      audio: { data: buffer, filename: file.name || "sample.wav", contentType: file.type || "audio/wav" },
    });
  } catch (error) {
    if (isProviderCreditError(error)) {
      return NextResponse.json(
        {
          error: "Voice Cloning is currently unavailable because the AI provider has insufficient API credits. Please try again later.",
          code: "provider_unavailable",
        },
        { status: 503 },
      );
    }
    if (error instanceof FishAudioError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Voice clone request failed", error);
    return NextResponse.json({ error: "Unable to clone this voice. Please try again." }, { status: 500 });
  }

  const { data: voice, error } = await supabase
    .from("voices")
    .insert({ user_id: user.id, name, type: "personal", fish_reference_id: fishModel.id })
    .select("id, name, type, created_at")
    .single();

  if (error || !voice) {
    // The Fish Audio model was created successfully but we couldn't persist it.
    // Never tell the client it succeeded, and clean up the orphaned remote model.
    console.error("Could not save cloned voice", error);
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
