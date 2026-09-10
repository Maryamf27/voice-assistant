import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { FishAudioError, searchVoices } from "@/lib/fish-audio";
import { VOICE_SEARCH_PAGE_SIZE, validateVoiceSearchPage, validateVoiceSearchQuery } from "@/lib/validation";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const url = new URL(request.url);

  const rawQuery = url.searchParams.get("q") ?? "";
  const query = rawQuery.trim();
  const queryError = validateVoiceSearchQuery(query || undefined);
  if (queryError) {
    return NextResponse.json({ error: queryError }, { status: 400 });
  }

  const rawPage = url.searchParams.get("page");
  const page = rawPage ? Number(rawPage) : 1;
  const pageError = validateVoiceSearchPage(page);
  if (pageError) {
    return NextResponse.json({ error: pageError }, { status: 400 });
  }

  const language = url.searchParams.get("language")?.trim() || undefined;

  try {
    const result = await searchVoices({ query: query || undefined, language, page, pageSize: VOICE_SEARCH_PAGE_SIZE });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof FishAudioError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Voice library search failed", error);
    return NextResponse.json({ error: "Unable to search the voice library right now. Please try again." }, { status: 500 });
  }
}
