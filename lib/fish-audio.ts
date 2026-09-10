const FISH_TTS_URL = "https://api.fish.audio/v1/tts";
const FISH_MODEL_URL = "https://api.fish.audio/model";
const FISH_VOICE_DESIGN_URL = "https://api.fish.audio/v1/voice-design";

export class FishAudioError extends Error { constructor(message: string, public readonly status: number) { super(message); } }

export function isProviderCreditError(error: unknown): boolean {
  return error instanceof FishAudioError && error.status === 402;
}

export type SpeechRequest = { text: string; model: string; referenceId?: string };
export type SpeechResult = { audio: ArrayBuffer; contentType: string };

export async function generateSpeech({ text, model, referenceId }: SpeechRequest): Promise<SpeechResult> {
  const apiKey = process.env.FISH_API_KEY;
  if (!apiKey) throw new FishAudioError("Text-to-speech is not configured on this server.", 500);
  let response: Response;
  try { response = await fetch(FISH_TTS_URL, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", model }, body: JSON.stringify({ text, ...(referenceId ? { reference_id: referenceId } : {}), format: "mp3", normalize: true }) }); } catch { throw new FishAudioError("The voice service could not be reached. Please try again.", 502); }
  if (!response.ok) { let message = "Fish Audio could not generate speech."; try { const body = await response.json() as { message?: string }; if (body.message) message = body.message; } catch { /* Keep a safe, generic failure message. */ } throw new FishAudioError(message, response.status === 402 ? 402 : 502); }
  return { audio: await response.arrayBuffer(), contentType: response.headers.get("content-type") || "audio/mpeg" };
}

export type CloneVoiceRequest = {
  title: string;
  audio: { data: Buffer; filename: string; contentType: string };
};
export type CloneVoiceResult = { id: string; state: string };

export async function cloneVoice({ title, audio }: CloneVoiceRequest): Promise<CloneVoiceResult> {
  const apiKey = process.env.FISH_API_KEY;
  if (!apiKey) throw new FishAudioError("Voice cloning is not configured on this server.", 500);

  const form = new FormData();
  form.set("type", "tts");
  form.set("title", title);
  form.set("train_mode", "fast");
  form.set("visibility", "private");
  form.set("voices", new Blob([new Uint8Array(audio.data)], { type: audio.contentType }), audio.filename);

  let response: Response;
  try {
    // Let fetch set the multipart Content-Type boundary itself; do not set it manually.
    response = await fetch(FISH_MODEL_URL, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
  } catch {
    throw new FishAudioError("The voice service could not be reached. Please try again.", 502);
  }

  if (!response.ok) {
    let message = "Fish Audio could not create this voice.";
    try { const body = await response.json() as { message?: string }; if (body.message) message = body.message; } catch { /* Keep a safe, generic failure message. */ }
    throw new FishAudioError(message, response.status === 402 ? 402 : 502);
  }

  const body = await response.json() as { _id?: string; state?: string };
  if (!body._id) throw new FishAudioError("Fish Audio did not return a voice model.", 502);
  if (body.state === "failed") throw new FishAudioError("Fish Audio could not train this voice from the provided sample.", 502);

  return { id: body._id, state: body.state ?? "created" };
}

export async function deleteVoiceModel(fishReferenceId: string): Promise<void> {
  const apiKey = process.env.FISH_API_KEY;
  if (!apiKey) return;
  try {
    const response = await fetch(`${FISH_MODEL_URL}/${encodeURIComponent(fishReferenceId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${apiKey}` } });
    if (!response.ok && response.status !== 404) console.error(`Fish Audio model deletion failed with status ${response.status}`);
  } catch (error) {
    console.error("Could not reach Fish Audio to delete voice model", error);
  }
}

export type VoiceDesignRequest = {
  instruction: string;
  referenceText?: string;
  language?: string;
  count?: number;
};

export type VoiceDesignCandidate = {
  id: string;
  index: number;
  audioBase64: string;
  sampleRate: number;
  durationMs: number;
  text: string | null;
  instruct: string | null;
  language: string | null;
};

type RawVoiceDesignCandidate = {
  id: string;
  index: number;
  audio_base64: string;
  sample_rate: number;
  duration_ms: number;
  text?: string | null;
  instruct?: string | null;
  language?: string | null;
};
export async function designVoice({ instruction, referenceText, language, count }: VoiceDesignRequest): Promise<VoiceDesignCandidate[]> {
  const apiKey = process.env.FISH_API_KEY;
  if (!apiKey) throw new FishAudioError("Voice design is not configured on this server.", 500);

  const payload: Record<string, unknown> = { instruction };
  if (referenceText) payload.reference_text = referenceText;
  if (language) payload.language = language;
  if (count) payload.n = count;

  let response: Response;
  try {
    response = await fetch(FISH_VOICE_DESIGN_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", model: "voice-design-1" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new FishAudioError("The voice service could not be reached. Please try again.", 502);
  }

  if (!response.ok) {
    let message = "Fish Audio could not generate voice candidates.";
    try { const body = await response.json() as { message?: string }; if (body.message) message = body.message; } catch { /* Keep a safe, generic failure message. */ }
    throw new FishAudioError(message, response.status === 402 ? 402 : 502);
  }

  const body = await response.json() as { candidates?: RawVoiceDesignCandidate[] };
  if (!body.candidates || body.candidates.length === 0) throw new FishAudioError("Fish Audio did not return any voice candidates. Try a more detailed description.", 502);

  return body.candidates.map((candidate) => ({
    id: candidate.id,
    index: candidate.index,
    audioBase64: candidate.audio_base64,
    sampleRate: candidate.sample_rate,
    durationMs: candidate.duration_ms,
    text: candidate.text ?? null,
    instruct: candidate.instruct ?? null,
    language: candidate.language ?? null,
  }));
}


type RawModelSample = { title: string; text: string; task_id: string; audio: string };

type RawModelEntity = {
  _id: string;
  title: string;
  description?: string;
  state: "created" | "training" | "trained" | "failed";
  tags?: string[];
  samples?: RawModelSample[];
  languages?: string[];
  visibility: "public" | "unlist" | "private";
  dmca_taken_down?: boolean | null;
  licensed?: boolean;
  author?: { _id: string; nickname: string; avatar: string };
};

type RawModelListResponse = { total: number; items: RawModelEntity[]; has_more?: boolean | null };

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

export type VoiceSearchQuery = { query?: string; language?: string; page?: number; pageSize?: number };
export type VoiceSearchResult = { voices: LibraryVoice[]; total: number; hasMore: boolean };

function normalizeLibraryVoice(model: RawModelEntity): LibraryVoice {
  const sample = model.samples && model.samples.length > 0 ? model.samples[0] : undefined;
  return {
    id: model._id,
    name: model.title,
    type: "library",
    fishReferenceId: model._id,
    // Only ever a real preview URL returned by Fish Audio for this exact model — never fabricated.
    previewUrl: sample?.audio || null,
    metadata: {
      language: model.languages && model.languages.length > 0 ? model.languages[0] : undefined,
      description: model.description || undefined,
      tags: model.tags ?? [],
      licensed: Boolean(model.licensed),
      author: model.author?.nickname || null,
    },
  };
}
function isEligibleForLibrary(model: RawModelEntity): boolean {
  return model.visibility === "public" && model.state === "trained" && !model.dmca_taken_down;
}

export async function searchVoices({ query, language, page = 1, pageSize = 12 }: VoiceSearchQuery): Promise<VoiceSearchResult> {
  const apiKey = process.env.FISH_API_KEY;
  if (!apiKey) throw new FishAudioError("Voice library search is not configured on this server.", 500);

  const params = new URLSearchParams();
  params.set("page_size", String(pageSize));
  params.set("page_number", String(page));
  params.set("self", "false");
  if (query) params.set("title", query);
  if (language) params.set("language", language);

  let response: Response;
  try {
    response = await fetch(`${FISH_MODEL_URL}?${params.toString()}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  } catch {
    throw new FishAudioError("The voice library could not be reached. Please try again.", 502);
  }

  if (!response.ok) {
    let message = "Fish Audio could not search the voice library.";
    try { const body = await response.json() as { message?: string }; if (body.message) message = body.message; } catch { /* Keep a safe, generic failure message. */ }
    throw new FishAudioError(message, 502);
  }

  const body = await response.json() as RawModelListResponse;
  const voices = (body.items ?? []).filter(isEligibleForLibrary).map(normalizeLibraryVoice);

  return { voices, total: body.total ?? voices.length, hasMore: Boolean(body.has_more) };
}

/**
 * Re-fetches a single model directly from Fish Audio by id and returns it only if it
 * is genuinely public. Used before saving a library voice to "My Voices" so the
 * backend never trusts a client-supplied id/name pair blindly — it always resolves
 * the trusted record from the authorized source itself.
 * See: https://docs.fish.audio/api-reference/endpoint/model/get-model
 */
export async function getPublicLibraryVoice(fishReferenceId: string): Promise<LibraryVoice | null> {
  const apiKey = process.env.FISH_API_KEY;
  if (!apiKey) throw new FishAudioError("Voice library search is not configured on this server.", 500);

  let response: Response;
  try {
    response = await fetch(`${FISH_MODEL_URL}/${encodeURIComponent(fishReferenceId)}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  } catch {
    throw new FishAudioError("The voice library could not be reached. Please try again.", 502);
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    let message = "Fish Audio could not look up this voice.";
    try { const body = await response.json() as { message?: string }; if (body.message) message = body.message; } catch { /* Keep a safe, generic failure message. */ }
    throw new FishAudioError(message, 502);
  }

  const model = await response.json() as RawModelEntity;
  if (!isEligibleForLibrary(model)) return null;
  return normalizeLibraryVoice(model);
}
