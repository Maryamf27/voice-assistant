"use client";

import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
  keepPreviousData,
  type QueryFunctionContext,
  type InfiniteData,
} from "@tanstack/react-query";
import { VOICE_SEARCH_PAGE_SIZE } from "@/lib/validation";

export type LibraryVoice = {
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

export type LibrarySearchPage = {
  voices: LibraryVoice[];
  total: number;
  hasMore: boolean;
  page: number;
};

export type MyVoice = {
  id: string;
  name: string;
  type: string;
  fishReferenceId: string | null;
  createdAt: string;
};

const LIBRARY_QUERY_KEY_BASE = "voice-library" as const;
const MY_VOICES_QUERY_KEY_BASE = "my-voices" as const;

type LibraryQueryFilter = { query: string; language?: string };

function librarySearchParams(filter: LibraryQueryFilter, page: number) {
  const params = new URLSearchParams();
  if (filter.query.trim()) params.set("q", filter.query.trim());
  params.set("page", String(page));
  if (filter.language) params.set("language", filter.language);
  return params.toString();
}

export function libraryQueryKey(filter: LibraryQueryFilter) {
  return [
    LIBRARY_QUERY_KEY_BASE,
    { query: filter.query.trim(), language: filter.language ?? "" },
  ] as const;
}

export function myVoicesQueryKey(userId: string) {
  return [MY_VOICES_QUERY_KEY_BASE, userId] as const;
}

export async function fetchLibraryPage({
  pageParam = 1,
  queryKey,
}: QueryFunctionContext<
  ReturnType<typeof libraryQueryKey>,
  number
>): Promise<LibrarySearchPage> {
  const [, filter] = queryKey;
  const params = librarySearchParams(
    { query: filter.query, language: filter.language || undefined },
    pageParam
  );
  const res = await fetch(`/api/voices/search?${params}`);
  if (!res.ok) {
    let message = "Unable to search the voice library right now.";
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* keep default message */
    }
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  const data = (await res.json()) as {
    voices: LibraryVoice[];
    total: number;
    hasMore: boolean;
  };
  return { ...data, page: pageParam };
}

export function useLibraryVoices(filter: LibraryQueryFilter) {
  return useInfiniteQuery({
    queryKey: libraryQueryKey(filter),
    queryFn: fetchLibraryPage,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    placeholderData: keepPreviousData,
    select: (data) => ({
      voices: data.pages.flatMap((p) => p.voices),
      total: data.pages[0]?.total ?? 0,
      hasMore: Boolean(data.pages[data.pages.length - 1]?.hasMore),
      pages: data.pages,
      pageParams: data.pageParams,
    }),
  });
}

export function useSingleLibraryPage(filter: LibraryQueryFilter, page: number) {
  const key: readonly [
    typeof LIBRARY_QUERY_KEY_BASE,
    { query: string; language: string },
    number
  ] = [
    LIBRARY_QUERY_KEY_BASE,
    { query: filter.query.trim(), language: filter.language ?? "" },
    page,
  ];
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const params = librarySearchParams(filter, page);
      const res = await fetch(`/api/voices/search?${params}`);
      if (!res.ok) {
        let message = "Unable to search the voice library right now.";
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          /* keep default message */
        }
        const error = new Error(message) as Error & { status?: number };
        error.status = res.status;
        throw error;
      }
      return (await res.json()) as {
        voices: LibraryVoice[];
        total: number;
        hasMore: boolean;
      };
    },
    staleTime: 7 * 60 * 1000,
    gcTime: 25 * 60 * 1000,
  });
}

export async function fetchMyVoices(): Promise<MyVoice[]> {
  const res = await fetch("/api/voices", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    let message = "Unable to load your voices.";
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* keep default message */
    }
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  const data = (await res.json()) as Array<{
    id: string;
    name: string;
    type: string;
    fish_reference_id: string | null;
    created_at: string;
  }>;
  return data.map((voice) => ({
    id: voice.id,
    name: voice.name,
    type: voice.type,
    fishReferenceId: voice.fish_reference_id,
    createdAt: voice.created_at,
  }));
}

export function useMyVoices(userId: string | null | undefined) {
  return useQuery({
    queryKey: myVoicesQueryKey(userId ?? "guest"),
    queryFn: fetchMyVoices,
    enabled: Boolean(userId),
    staleTime: 4 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });
}

export function usePrefetchLibrary() {
  const queryClient = useQueryClient();
  return (filter: LibraryQueryFilter = { query: "" }) => {
    const key = libraryQueryKey(filter);
    return queryClient.prefetchInfiniteQuery({
      queryKey: key,
      queryFn: fetchLibraryPage,
      initialPageParam: 1,
      pages: 1,
      getNextPageParam: () => undefined,
      staleTime: 7 * 60 * 1000,
    });
  };
}

export function useInvalidateLibrary() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: [LIBRARY_QUERY_KEY_BASE],
      type: "all",
    });
}

export function useInvalidateMyVoices() {
  const queryClient = useQueryClient();
  return (userId: string | null | undefined) => {
    if (!userId) return;
    return queryClient.invalidateQueries({
      queryKey: [MY_VOICES_QUERY_KEY_BASE],
      type: "all",
    });
  };
}

export function useIsLibraryCached(filter: LibraryQueryFilter) {
  const queryClient = useQueryClient();
  const data = queryClient.getQueryState<
    InfiniteData<LibrarySearchPage, number>
  >(libraryQueryKey(filter));
  return Boolean(data && data.data?.pages?.length);
}

export { VOICE_SEARCH_PAGE_SIZE };
