"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Equalizer, Waveform } from "@/components/ui";
import { IconSearch, IconCheck, IconTag, IconAlert } from "@/components/icons";

const SEARCH_DEBOUNCE_MS = 400;

type LibraryVoice = {
  id: string;
  name: string;
  type: "library";
  fishReferenceId: string;
  previewUrl: string | null;
  metadata: {
    language?: string;
    description?: string;
    tags: string[];
    licensed: boolean;
    author: string | null;
  };
};

type SearchResponse = { voices: LibraryVoice[]; total: number; hasMore: boolean };

export function VoiceLibrary() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [voices, setVoices] = useState<LibraryVoice[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  async function runSearch(nextQuery: string, nextPage: number, append: boolean) {
    const thisRequest = ++requestId.current;
    if (append) setLoadingMore(true); else setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      params.set("page", String(nextPage));

      const response = await fetch(`/api/voices/search?${params.toString()}`);
      if (thisRequest !== requestId.current) return; // a newer search superseded this one

      if (!response.ok) {
        let message = "Unable to search the voice library right now.";
        try { const body = await response.json() as { error?: string }; if (body.error) message = body.error; } catch { /* Use the default message. */ }
        setError(message);
        if (!append) setVoices([]);
        return;
      }

      const data = await response.json() as SearchResponse;
      setVoices((prev) => (append ? [...prev, ...data.voices] : data.voices));
      setTotal(data.total);
      setHasMore(data.hasMore);
      setPage(nextPage);
    } catch {
      if (thisRequest !== requestId.current) return;
      setError("A network error occurred. Please check your connection and try again.");
      if (!append) setVoices([]);
    } finally {
      if (thisRequest === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }

  // Load default/popular authorized voices on mount, then debounce as the user types.
  useEffect(() => {
    const handle = setTimeout(() => { runSearch(query, 1, false); }, query ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(handle);
  }, [query]);

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
        <p className="mt-2 text-xs text-ink-faint">
          {loading ? "Searching…" : `Showing ${voices.length} of ${total.toLocaleString()} authorized voices.`}
        </p>
      </Card>

      <div className="mt-6">
        {error && (
          <Card className="flex items-start gap-2 p-6 text-sm text-state-rose">
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </Card>
        )}

        {!error && loading && (
          <Card className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-sm text-ink-faint">
            <Equalizer />
            Searching the voice library…
          </Card>
        )}

        {!error && !loading && voices.length === 0 && (
          <Card className="flex min-h-40 flex-col items-center justify-center p-6 text-center text-sm text-ink-faint">
            <p className="font-medium text-ink-muted">No voices found.</p>
            <p className="mt-1 max-w-sm">Try a different search term, or check back later as more authorized voices are added.</p>
          </Card>
        )}

        {!error && !loading && voices.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {voices.map((voice) => <VoiceLibraryCard key={voice.id} voice={voice} />)}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => runSearch(query, page + 1, true)}
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

function VoiceLibraryCard({ voice }: { voice: LibraryVoice }) {
  const router = useRouter();
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
        body: JSON.stringify({ fishReferenceId: voice.fishReferenceId, name: voice.name }),
      });

      if (!response.ok) {
        let message = "Unable to save this voice. Please try again.";
        try { const data = await response.json() as { error?: string }; if (data.error) message = data.error; } catch { /* Use the default message. */ }
        setError(message);
        return null;
      }

      const data = await response.json() as { id: string };
      setSavedVoiceId(data.id);
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
    router.refresh();
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
            {[voice.metadata.language, voice.metadata.author ? `by ${voice.metadata.author}` : null].filter(Boolean).join(" • ") || "Authorized voice"}
          </p>
        </div>
        {voice.metadata.licensed && (
          <span className="shrink-0 rounded-full bg-audio-mint/10 px-2 py-1 text-xs text-audio-mint">Licensed</span>
        )}
      </div>

      {voice.metadata.description && (
        <p className="mt-3 text-xs leading-5 text-ink-muted line-clamp-2">{voice.metadata.description}</p>
      )}

      {voice.metadata.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {voice.metadata.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-base-surface px-2 py-0.5 text-xs text-ink-muted">
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
          <audio controls src={voice.previewUrl} className="mt-1.5 w-full">
            Your browser does not support the audio element.
          </audio>
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
      {error && <p role="alert" className="mt-2 text-xs text-state-rose">{error}</p>}
    </Card>
  );
}
