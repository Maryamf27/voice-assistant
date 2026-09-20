"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, Equalizer, Waveform } from "@/components/ui";
import { IconSearch, IconCheck, IconTag, IconAlert } from "@/components/icons";
import { AudioPlayer } from "@/components/audio-playback";
import {
  useLibraryVoices,
  useInvalidateMyVoices,
  type LibraryVoice as LibraryVoiceItem,
} from "@/components/voice-queries";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const SEARCH_DEBOUNCE_MS = 400;

async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export function VoiceLibrary() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlQuery = searchParams.get("search") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const normalizedQuery = debouncedQuery.trim();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError,
    error,
    isFetching,
  } = useLibraryVoices({ query: normalizedQuery });

  const voices = data?.voices ?? [];
  const total = data?.total ?? 0;
  const hasMore = Boolean(hasNextPage);
  const loadingMore = isFetchingNextPage;
  const loadingInitial = isPending && !isFetchingNextPage;
  const refetching = isFetching && !isPending && !isFetchingNextPage;

  useEffect(() => {
    if (urlQuery === normalizedQuery) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    if (normalizedQuery) nextParams.set("search", normalizedQuery);
    else nextParams.delete("search");
    const nextQs = nextParams.size ? `?${nextParams.toString()}` : "";
    if (`${pathname}${nextQs}` === `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`) return;
    router.replace(`${pathname}${nextQs}`, { scroll: false });
  }, [normalizedQuery, pathname, router, searchParams, urlQuery]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync search state with browser navigation.
    setQuery((current) => (current === urlQuery ? current : urlQuery));
  }, [urlQuery]);

  const errorMessage = isError
    ? error instanceof Error
      ? error.message || "Unable to search the voice library right now."
      : "Unable to search the voice library right now."
    : "";

  return (
    <div>
      <Card className="p-4 sm:p-5">
        <label className="text-sm font-medium text-ink-primary">
          Search voices
          <div className="relative mt-2">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={100}
              placeholder="Search by name, e.g. “warm narrator”"
              className="pl-9"
            />
          </div>
        </label>
        <p className="mt-2 flex items-center gap-2 text-xs text-ink-faint">
          {loadingInitial
            ? "Searching…"
            : `Showing ${voices.length} of ${total.toLocaleString()} authorized voices.`}
          {refetching && (
            <span className="inline-flex items-center gap-1 text-brand-violetSoft">
              <Equalizer size="sm" />
              <span>Refreshing…</span>
            </span>
          )}
        </p>
      </Card>

      <div className="mt-6">
        {errorMessage && !loadingInitial && (
          <Card className="flex items-start gap-2 p-6 text-sm text-state-rose">
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage}
          </Card>
        )}

        {loadingInitial && (
          <Card className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-sm text-ink-faint">
            <Equalizer />
            Searching the voice library…
          </Card>
        )}

        {!loadingInitial && !errorMessage && voices.length === 0 && (
          <Card className="flex min-h-40 flex-col items-center justify-center p-6 text-center text-sm text-ink-faint">
            <p className="font-medium text-ink-muted">No voices found.</p>
            <p className="mt-1 max-w-sm">
              Try a different search term, or check back later as more authorized
              voices are added.
            </p>
          </Card>
        )}

        {!loadingInitial && voices.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {voices.map((voice) => (
                <VoiceLibraryCard key={voice.id} voice={voice} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={loadingMore}
                  className="rounded-lg border border-base-border px-4 py-2 text-sm text-ink-muted transition hover:border-brand-violet/40 hover:text-brand-violetSoft disabled:opacity-60"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

function VoiceLibraryCard({ voice }: { voice: LibraryVoiceItem }) {
  const router = useRouter();
  const invalidateMyVoices = useInvalidateMyVoices();
  const [savedVoiceId, setSavedVoiceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [usingInTts, setUsingInTts] = useState(false);
  const [error, setError] = useState("");

  async function saveToMyVoices(): Promise<string | null> {
    if (savedVoiceId) return savedVoiceId;
    setError("");

    try {
      const response = await fetch("/api/voices/library/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fishReferenceId: voice.fishReferenceId,
          name: voice.name,
        }),
      });

      if (!response.ok) {
        let message = "Unable to save this voice. Please try again.";
        try {
          const data = (await response.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          /* Use the default message. */
        }
        setError(message);
        return null;
      }

      const data = (await response.json()) as { id: string };
      setSavedVoiceId(data.id);
      try {
        const uid = await getCurrentUserId();
        if (uid) await invalidateMyVoices(uid);
      } catch {
        /* Best-effort invalidation; next navigation remount will refetch anyway. */
      }
      return data.id;
    } catch {
      setError("A network error occurred. Please try again.");
      return null;
    }
  }

  async function handleSave() {
    setSaving(true);
    await saveToMyVoices();
    setSaving(false);
  }

  async function handleUseInTts() {
    setUsingInTts(true);
    const id = await saveToMyVoices();
    setUsingInTts(false);
    if (id) router.push(`/dashboard/tts?voice=${id}`);
  }

  return (
    <Card className="group p-5 transition hover:border-brand-violet/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-primary">{voice.name}</p>
          <p className="mt-1 text-xs text-ink-faint">
            {[
              voice.metadata.language,
              voice.metadata.author ? `by ${voice.metadata.author}` : null,
            ]
              .filter(Boolean)
              .join(" • ") || "Authorized voice"}
          </p>
        </div>
        {voice.metadata.licensed && (
          <span className="shrink-0 rounded-full bg-audio-mint/10 px-2 py-1 text-xs text-audio-mint">
            Licensed
          </span>
        )}
      </div>

      {voice.metadata.description && (
        <p className="mt-3 text-xs leading-5 text-ink-muted line-clamp-2">
          {voice.metadata.description}
        </p>
      )}

      {voice.metadata.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {voice.metadata.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-base-surface px-2 py-0.5 text-xs text-ink-muted"
            >
              <IconTag className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {voice.previewUrl ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-base-border bg-base-bg p-2">
          <div className="h-8">
            <Waveform seed={voice.id} bars={32} className="h-full" />
          </div>
          <AudioPlayer src={voice.previewUrl} className="mt-1.5" />
        </div>
      ) : (
        <p className="mt-4 text-xs text-ink-faint">No preview available.</p>
      )}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || Boolean(savedVoiceId)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-base-border px-3 py-2 text-xs text-ink-muted transition hover:border-brand-violet/40 hover:text-brand-violetSoft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savedVoiceId && <IconCheck className="h-3.5 w-3.5" />}
          {savedVoiceId ? "Saved" : saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={handleUseInTts}
          disabled={usingInTts}
          className="ml-auto rounded-lg bg-brand-violet px-3 py-2 text-xs font-medium text-white transition hover:bg-brand-violetDim disabled:cursor-not-allowed disabled:opacity-60"
        >
          {usingInTts ? "Preparing…" : "Use in TTS"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-state-rose">
          {error}
        </p>
      )}
    </Card>
  );
}
