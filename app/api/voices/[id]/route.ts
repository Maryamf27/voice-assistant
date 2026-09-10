import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteVoiceModel } from "@/lib/fish-audio";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "That voice is invalid." }, { status: 400 });
  }
  const { data: voice, error: findError } = await supabase
    .from("voices")
    .select("fish_reference_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (findError) {
    console.error("Could not look up voice for deletion", findError);
    return NextResponse.json({ error: "Unable to delete this voice. Please try again." }, { status: 500 });
  }
  if (!voice) {
    return NextResponse.json({ error: "That voice is unavailable." }, { status: 404 });
  }

  const { error: deleteError } = await supabase.from("voices").delete().eq("id", id).eq("user_id", user.id);
  if (deleteError) {
    console.error("Could not delete voice", deleteError);
    return NextResponse.json({ error: "Unable to delete this voice. Please try again." }, { status: 500 });
  }

  if (voice.fish_reference_id) {
    await deleteVoiceModel(voice.fish_reference_id);
  }

  return NextResponse.json({ success: true });
}
