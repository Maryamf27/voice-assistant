import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteAudio } from "@/lib/storage";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "That generation is invalid." }, { status: 400 });
  }
  const { data: generation, error: findError } = await supabase
    .from("generations")
    .select("audio_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (findError) {
    console.error("Could not look up generation for deletion", findError);
    return NextResponse.json({ error: "Unable to delete this item. Please try again." }, { status: 500 });
  }
  if (!generation) {
    return NextResponse.json({ error: "That generation is unavailable." }, { status: 404 });
  }

  const { error: deleteError } = await supabase.from("generations").delete().eq("id", id).eq("user_id", user.id);
  if (deleteError) {
    console.error("Could not delete generation", deleteError);
    return NextResponse.json({ error: "Unable to delete this item. Please try again." }, { status: 500 });
  }

  if (generation.audio_url) {
    await deleteAudio(supabase, generation.audio_url);
  }

  return NextResponse.json({ success: true });
}
