"use client";
import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, StatusBadge, Equalizer, Waveform } from "@/components/ui";
import { ConfirmDialog } from "@/components/dialog";
import { Select } from "@/components/select";
import { IconSearch, IconDownload, IconTrash, IconAlert } from "@/components/icons";
import { AudioPlayer } from "@/components/audio-playback";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All voices" },
  { value: "default", label: "Default voice" },
  { value: "personal", label: "Personal" },
  { value: "designed", label: "Designed" },
  { value: "library", label: "Library" },
];

const voiceTypeLabels: Record<string, string> = { personal: "Personal", designed: "Designed", library: "Library" };

type HistoryItem = {
  id: string;
  type: string;
  text: string;
  voiceName: string | null;
  voiceType: string | null;
  model: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  audioUrl: string | null;
  createdAt: string;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };
type HistoryResponse = { items: HistoryItem[]; pagination: Pagination };

const HISTORY_QUERY_KEY_BASE = "history" as const;

type HistoryFilter = { q: string; voiceType: string; page: number };

function historyQueryKey(filter: HistoryFilter) {
  return [HISTORY_QUERY_KEY_BASE, filter] as const;
}

async function fetchHistory(filter: HistoryFilter): Promise<HistoryResponse> {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.voiceType !== "all") params.set("voiceType", filter.voiceType);
  params.set("page", String(filter.page));
  params.set("limit", String(PAGE_SIZE));

  const response = await fetch(`/api/history?${params.toString()}`);
  if (!response.ok) {
    let message = "Unable to load history right now.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* Use the default message. */
    }
    const failure = new Error(message) as Error & { status?: number };
    failure.status = response.status;
    throw failure;
  }
  return (await response.json()) as HistoryResponse;
}

/** Mirrors the original behaviour: debounce while typing, but react instantly when the box is cleared. */
function useDebouncedQuery(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), value ? delayMs : 0);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

export function HistoryList() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [voiceType, setVoiceType] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedQuery(query, SEARCH_DEBOUNCE_MS);

  // A new search or filter always restarts at page 1. Adjusting during render
  // (rather than in an effect) means React re-renders with the corrected page
  // before committing, so no request is ever issued for the stale page.
  const filterKey = `${debouncedQuery.trim()}|${voiceType}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const filter: HistoryFilter = { q: debouncedQuery.trim(), voiceType, page };

  // Cached per filter+page, so navigating away and back to History renders the
  // previous result immediately instead of showing the loading card again.
  // keepPreviousData does the same for searching and paging within the page.
  const historyQuery = useQuery({
    queryKey: historyQueryKey(filter),
    queryFn: () => fetchHistory(filter),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (!response.ok) {
        let message = "Unable to delete this item.";
        try {
          const data = (await response.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          /* Use the default message. */
        }
        throw new Error(message);
      }
    },
    onSuccess: () => {
      setPendingDeleteId(null);
      void queryClient.invalidateQueries({ queryKey: [HISTORY_QUERY_KEY_BASE] });
    },
  });

  const items = historyQuery.data?.items ?? [];
  const pagination = historyQuery.data?.pagination ?? { page, limit: PAGE_SIZE, total: 0, totalPages: 1 };
  const loading = historyQuery.isPending;
  const deleting = deleteMutation.isPending;
  const error = historyQuery.isError
    ? (historyQuery.error as Error).message || "Unable to load history right now."
    : deleteMutation.isError
      ? (deleteMutation.error as Error).message
      : "";

  function confirmDelete() {
    if (!pendingDeleteId) return;
    deleteMutation.mutate(pendingDeleteId);
  }

  return (
    <div>
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="relative w-full sm:max-w-sm">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={200}
            placeholder="Search your generated text…"
            className="pl-9"
          />
        </div>
        <Select
          value={voiceType}
          onChange={setVoiceType}
          options={FILTERS}
          aria-label="Filter by voice type"
          className="w-full sm:w-48"
        />
        <p className="text-xs text-ink-faint sm:ml-auto">
          {loading ? "Loading…" : `${pagination.total.toLocaleString()} total`}
        </p>
      </Card>

      <div className="mt-6 space-y-4">
        {error && (
          <Card className="flex items-start gap-2 p-6 text-sm text-state-rose">
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </Card>
        )}
        {!error && loading && (
          <Card className="flex min-h-32 flex-col items-center justify-center gap-3 p-6 text-sm text-ink-faint">
            <Equalizer />
            Loading history…
          </Card>
        )}
        {!error && !loading && items.length === 0 && (
          <Card className="flex min-h-32 items-center justify-center p-6 text-sm text-ink-faint">No generations yet.</Card>
        )}
        {!error && !loading && items.map((item) => (
          <HistoryCard key={item.id} item={item} onDelete={() => setPendingDeleteId(item.id)} />
        ))}
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this generation?"
        description="The generated audio and its history entry will be permanently removed. This cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      {!loading && !error && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-ink-muted">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={pagination.page <= 1}
            className="rounded-lg border border-base-border px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
            disabled={pagination.page >= pagination.totalPages}
            className="rounded-lg border border-base-border px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function HistoryCard({ item, onDelete }: { item: HistoryItem; onDelete: () => void }) {
  const voiceLabel = item.voiceName
    ? `${item.voiceName}${item.voiceType ? ` (${voiceTypeLabels[item.voiceType] ?? item.voiceType})` : ""}`
    : "Default voice";

  return (
    <Card className="p-5 transition hover:border-brand-violet/25">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm text-ink-primary/90">{item.text}</p>
          <p className="mt-1.5 text-xs text-ink-faint">
            {[voiceLabel, item.model, new Date(item.createdAt).toLocaleString()].filter(Boolean).join(" • ")}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      {item.status === "completed" && item.audioUrl && (
        <div className="mt-4 overflow-hidden rounded-xl border border-base-border bg-base-bg p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="h-9 flex-1">
              <Waveform seed={item.id} bars={40} className="h-full" active />
            </div>
            <div className="flex shrink-0 gap-2">
              <a
                href={item.audioUrl}
                download
                className="inline-flex items-center gap-1.5 rounded-lg border border-base-border px-3 py-2 text-xs text-ink-muted transition hover:border-brand-violet/40 hover:text-brand-violetSoft"
              >
                <IconDownload className="h-3.5 w-3.5" />
                Download
              </a>
              <button type="button" onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-lg border border-base-border px-3 py-2 text-xs text-ink-muted transition hover:border-state-rose/40 hover:text-state-rose">
                <IconTrash className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
          <AudioPlayer src={item.audioUrl} className="mt-2" />
        </div>
      )}

      {item.status === "processing" && (
        <div className="mt-4">
          <Equalizer label="Processing…" size="sm" />
        </div>
      )}
      {item.status === "pending" && <p className="mt-4 text-xs text-state-amber">Pending…</p>}
      {item.status === "failed" && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-state-rose">Failed</p>
          <button type="button" onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-lg border border-base-border px-3 py-2 text-xs text-ink-muted transition hover:border-state-rose/40 hover:text-state-rose">
            <IconTrash className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </Card>
  );
}
