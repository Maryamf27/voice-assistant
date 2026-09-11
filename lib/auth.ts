import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; name: string; email: string };

export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile } = await supabase.from("profiles").select("name").eq("id", data.user.id).single();

  const metadataName = typeof data.user.user_metadata?.name === "string" ? data.user.user_metadata.name : "";
  return { id: data.user.id, email: data.user.email ?? "", name: profile?.name || metadataName || "there" };
}
