import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAudioUrl } from "@/lib/storage";
import type { VoiceType } from "@/lib/supabase/types";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_QUERY_LENGTH = 200;

// Filters correspond to real, existing data: which saved voice (if any) a
// generation used. No database field is invented to support this — it's derived
// by looking up the linked voice's type.
const VOICE_TYPE_FILTERS = ["all", "default", "personal", "designed", "library"] as const;
type VoiceTypeFilter = (typeof VOICE_TYPE_FILTERS)[number];

// Escapes PostgREST ILIKE wildcard characters in user-supplied search text.
function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (match) => `\\${match}`);
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const url = new URL(request.url);

  const rawPage = url.searchParams.get("page");
  const page = rawPage ? Number(rawPage) : 1;
  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json({ error: "That page number is invalid." }, { status: 400 });
  }

  const rawLimit = url.searchParams.get("limit");
  const limit = rawLimit ? Number(rawLimit) : DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return NextResponse.json({ error: "That page size is invalid." }, { status: 400 });
  }

  const search = (url.searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);

  const rawVoiceType = (url.searchParams.get("voiceType") ?? "all") as VoiceTypeFilter;
  if (!VOICE_TYPE_FILTERS.includes(rawVoiceType)) {
    return NextResponse.json({ error: "That filter is invalid." }, { status: 400 });
  }

  try {
    // When filtering by a specific voice type, first resolve which of this
    // user's own voices match — then filter generations by those ids. This
    // avoids relying on fragile embedded-resource join filtering.
    let voiceIdFilter: string[] | null = null;
    if (rawVoiceType !== "all" && rawVoiceType !== "default") {
      const { data: matchingVoices, error: voicesError } = await supabase
        .from("voices")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", rawVoiceType);
      if (voicesError) throw voicesError;
      voiceIdFilter = (matchingVoices ?? []).map((voice) => voice.id);
    }

    let query = supabase
      .from("generations")
      .select("id, type, input, voice_id, voice_name, model, status, audio_url, created_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.ilike("input", `%${escapeLikePattern(search)}%`);
    }
    if (rawVoiceType === "default") {
      query = query.is("voice_id", null);
    } else if (voiceIdFilter !== null) {
      // An empty match list means "no generations can match" rather than "no filter".
      query = voiceIdFilter.length > 0 ? query.in("voice_id", voiceIdFilter) : query.eq("id", "00000000-0000-0000-0000-000000000000");
    }

    const { data: rows, count, error } = await query;
    if (error) throw error;

    // Look up each represented voice's type in one extra query, so History can
    // label e.g. "Personal" / "Designed" / "Library" per row.
    const voiceIds = Array.from(new Set((rows ?? []).map((row) => row.voice_id).filter((id): id is string => Boolean(id))));
    const voiceTypeById = new Map<string, VoiceType>();
    if (voiceIds.length > 0) {
      const { data: voiceRows, error: voiceLookupError } = await supabase
        .from("voices")
        .select("id, type")
        .eq("user_id", user.id)
        .in("id", voiceIds);
      if (voiceLookupError) throw voiceLookupError;
      (voiceRows ?? []).forEach((voice) => voiceTypeById.set(voice.id, voice.type));
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const items = (rows ?? []).map((row) => ({
      id: row.id,
      type: row.type,
      text: row.input,
      voiceName: row.voice_name ?? null,
      voiceType: row.voice_id ? voiceTypeById.get(row.voice_id) ?? null : null,
      model: row.model ?? null,
      status: row.status,
      // Only ever the real, persisted storage path — never a placeholder for
      // pending/failed items. Kept as the storage path here; the frontend
      // already receives a fully-formed signed URL on creation via /api/tts,
      // and a fresh one is minted below for completed items on read.
      audioUrl: row.status === "completed" ? row.audio_url ?? null : null,
      createdAt: row.created_at,
    }));

    // Mint a fresh signed URL for each completed item's stored path.
    const withSignedUrls = await Promise.all(
      items.map(async (item) => ({
        ...item,
        audioUrl: item.audioUrl ? await getAudioUrl(supabase, item.audioUrl) : null,
      })),
    );

    return NextResponse.json({ items: withSignedUrls, pagination: { page, limit, total, totalPages } });
  } catch (error) {
    console.error("Could not load history", error);
    return NextResponse.json({ error: "Unable to load history right now. Please try again." }, { status: 500 });
  }
}
