import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FishAudioError, getPublicLibraryVoice } from "@/lib/fish-audio";
import { validateFishReferenceId, validateVoiceName } from "@/lib/validation";

type SaveLibraryInput = { fishReferenceId?: unknown; name?: unknown };

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  let input: SaveLibraryInput;
  try {
    input = await request.json() as SaveLibraryInput;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const idError = validateFishReferenceId(input.fishReferenceId);
  if (idError) {
    return NextResponse.json({ error: idError }, { status: 400 });
  }
  const fishReferenceId = (input.fishReferenceId as string).trim();

  const requestedName = typeof input.name === "string" ? input.name.trim() : "";
  if (requestedName) {
    const nameError = validateVoiceName(requestedName);
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }
  }
  let libraryVoice;
  try {
    libraryVoice = await getPublicLibraryVoice(fishReferenceId);
  } catch (error) {
    if (error instanceof FishAudioError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not verify library voice", error);
    return NextResponse.json({ error: "Unable to save this voice. Please try again." }, { status: 500 });
  }

  if (!libraryVoice) {
    return NextResponse.json({ error: "That voice is unavailable." }, { status: 404 });
  }

  const name = requestedName || libraryVoice.name;

  const { data: existing, error: existingError } = await supabase
    .from("voices")
    .select("id, name, created_at")
    .eq("user_id", user.id)
    .eq("type", "library")
    .eq("fish_reference_id", fishReferenceId)
    .maybeSingle();

  if (existingError) {
    console.error("Could not check for an existing saved library voice", existingError);
    return NextResponse.json({ error: "Unable to save this voice. Please try again." }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json(
      { id: existing.id, name: existing.name, type: "library", createdAt: existing.created_at, alreadySaved: true },
      { status: 200 },
    );
  }

  const { data: voice, error } = await supabase
    .from("voices")
    .insert({ user_id: user.id, name, type: "library", fish_reference_id: fishReferenceId })
    .select("id, name, type, created_at")
    .single();

  if (error || !voice) {
    // This is a shared, provider-owned voice model, not one we created — on
    // failure there is nothing of ours on Fish Audio to clean up.
    console.error("Could not save library voice", error);
    return NextResponse.json({ error: "Unable to save this voice. Please try again." }, { status: 500 });
  }

  return NextResponse.json(
    { id: voice.id, name: voice.name, type: voice.type, createdAt: voice.created_at },
    { status: 201 },
  );
}
