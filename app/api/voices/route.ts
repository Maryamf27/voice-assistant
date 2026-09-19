import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("voices")
    .select("id, name, type")
    .eq("user_id", user.id)
    .not("fish_reference_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load voices for current user", error);
    return NextResponse.json(
      { error: "Unable to load your voices. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json((data ?? []).map((v) => ({ id: v.id, name: v.name, type: v.type })));
}
