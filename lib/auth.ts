import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; name: string; email: string };

/**
 * Resolves the current authenticated user from the Supabase session cookie.
 * Uses auth.getUser() (not getSession()) so the token is validated against
 * the Supabase Auth server rather than just trusted from the local cookie.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile } = await supabase.from("profiles").select("name").eq("id", data.user.id).single();

  const metadataName = typeof data.user.user_metadata?.name === "string" ? data.user.user_metadata.name : "";
  return { id: data.user.id, email: data.user.email ?? "", name: profile?.name || metadataName || "there" };
}
