import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type SessionUser = { id: string; name: string; email: string };

export type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "name"
  | "plan"
  | "subscription_status"
  | "lemonsqueezy_subscription_id"
  | "lemonsqueezy_customer_id"
  | "lemonsqueezy_variant_id"
  | "subscription_interval"
  | "subscription_ends_at"
  | "subscription_renews_at"
>;

const PROFILE_COLUMNS =
  "name, plan, subscription_status, lemonsqueezy_subscription_id, lemonsqueezy_customer_id, lemonsqueezy_variant_id, subscription_interval, subscription_ends_at, subscription_renews_at";

export const getSessionProfile = cache(async function getSessionProfile(): Promise<{
  user: SessionUser | null;
  profile: ProfileRow | null;
}> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return { user: null, profile: null };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", claims.sub)
    .single<ProfileRow>();

  if (profileError) {
    console.error("Could not load user profile:", profileError);
  }

  const metadataName = typeof claims.user_metadata?.name === "string" ? claims.user_metadata.name : "";

  return {
    user: {
      id: claims.sub,
      email: typeof claims.email === "string" ? claims.email : "",
      name: profile?.name || metadataName || "there",
    },
    profile: profile ?? null,
  };
});

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const { user } = await getSessionProfile();
  return user;
});
