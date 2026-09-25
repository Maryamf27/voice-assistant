"use client";
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, ProviderUnavailableNotice, Equalizer, Waveform } from "@/components/ui";
import { Select } from "@/components/select";
import { IconUpload, IconCheck, IconAlert, IconWaveform, IconMic, IconSparkle, IconLibrary, IconVoices, IconSearch } from "@/components/icons";
import { AudioPlayer } from "@/components/audio-playback";
import { FREE_TTS_CHARACTER_LIMIT, MAX_TTS_REQUEST_LENGTH } from "@/lib/entitlement-constants";
import { useLibraryVoices, useMyVoices, useInvalidateMyVoices, type MyVoice } from "@/components/voice-queries";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildExpressionText, EMOTION_HELP, EMOTION_LABELS, EXPRESSION_LABELS, VOICE_EMOTIONS, VOICE_EXPRESSIONS, type VoiceEmotion, type VoiceExpression } from "@/lib/tts-emotions";

const MAX_TEXT_LENGTH = MAX_TTS_REQUEST_LENGTH;

type TtsVoiceOption = { id: string; name: string; type: string };

async function getTtsUserId(): Promise<string | null> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export function TtsForm({ voices = [], model = null, initialVoiceId = "", characterLimit = FREE_TTS_CHARACTER_LIMIT, userId }: { voices?: TtsVoiceOption[]; model?: string | null; initialVoiceId?: string; characterLimit?: number | null; userId?: string | null }) {
  const [resolvedUserId, setResolvedUserId] = useState<string | null | undefined>(userId);
  const { data: fetchedMyVoices, isFetching: isMyVoicesFetching } = useMyVoices(resolvedUserId ?? null);
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState(initialVoiceId);
  const [libraryQuery, setLibraryQuery] = useState("");
  const deferredLibraryQuery = useDeferredValue(libraryQuery);
  const librarySearch = useLibraryVoices({ query: deferredLibraryQuery });
  const [emotion, setEmotion] = useState<VoiceEmotion>("neutral");
  const [expression, setExpression] = useState<VoiceExpression>("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resolvedUserId !== undefined) return;
    let cancelled = false;
    getTtsUserId().then((uid) => {
      if (!cancelled) setResolvedUserId(uid);
    });
    return () => { cancelled = true; };
  }, [resolvedUserId]);

  useEffect(() => {
    if (!initialVoiceId) return;
    setVoiceId(initialVoiceId);
  }, [initialVoiceId]);

  const combinedVoices = useMemo<TtsVoiceOption[]>(() => {
    const merged = new Map<string, TtsVoiceOption>();
    for (const v of voices) merged.set(`${v.type}:${v.id}`, { id: v.id, name: v.name, type: v.type });
    if (fetchedMyVoices) {
      for (const v of fetchedMyVoices as MyVoice[]) {
        if (v.type === "personal" || v.type === "library" || v.type === "designed") {
          merged.set(`${v.type}:${v.id}`, { id: v.id, name: v.name, type: v.type });
        }
      }
    }
    return Array.from(merged.values());
  }, [voices, fetchedMyVoices]);

  const savedLibraryVoices = combinedVoices.filter((voice) => voice.type === "library");
  const libraryVoices = useMemo<TtsVoiceOption[]>(() => {
    const merged = new Map(savedLibraryVoices.map((voice) => [voice.id, voice]));
    for (const voice of librarySearch.data?.voices ?? []) {
      merged.set(voice.id, { id: voice.id, name: voice.name, type: "library" });
    }
    return Array.from(merged.values());
  }, [savedLibraryVoices, librarySearch.data?.voices]);
  const myVoices = combinedVoices.filter((voice) => voice.type === "personal");
  const selectedVoice = combinedVoices.find(v => v.id === voiceId);
  void isMyVoicesFetching;

  function applyStyle(nextEmotion: VoiceEmotion, nextExpression: VoiceExpression) {
    setEmotion(nextEmotion);
    setExpression(nextExpression);
    setText((current) => {
      const content = current.replace(/^(?:\[[^\]]+\]\s*)+/, "").trimStart();
      return buildExpressionText(content, nextEmotion, nextExpression);
    });
  }

  useEffect(() => {
    if (audioUrl) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [audioUrl]);

  async function handleGenerate() {
    const trimmed = text.trim();
    if (!trimmed) { setError("Enter some text to generate speech."); return; }
    if (!model) { setError("Text-to-speech is not configured on this server."); return; }
    if (characterLimit !== null && trimmed.length > characterLimit) {
      setError(`Free plans can generate up to ${characterLimit.toLocaleString()} characters per request.`);
      return;
    }

    setLoading(true);
    setError("");
    setUnavailable("");

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, emotion, expression, ...(voiceId ? { voiceId } : {}) }),
      });

      if (!response.ok) {
        let message = "Unable to generate speech. Please try again.";
        let code = "";
        try {
          const body = await response.json() as { error?: string; message?: string; code?: string };
          if (body.message) message = body.message;
          else if (body.error && body.error !== "TTS_CHARACTER_LIMIT_EXCEEDED") message = body.error;
          if (body.error === "TTS_CHARACTER_LIMIT_EXCEEDED") code = body.error;
          if (body.code) code = body.code;
        } catch { /* Use the default message. */ }
        if (code === "provider_unavailable") setUnavailable(message); else setError(message);
        return;
      }
      const data = await response.json() as { audioUrl: string };
      setAudioUrl(data.audioUrl);
    } catch {
      setError("A network error occurred. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="min-w-0 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="tts-script" className="flex items-center gap-2 text-sm font-medium text-ink-primary">
            <IconWaveform className="h-4 w-4 text-brand-violetSoft" />
            Your script
          </label>
        </div>
        <textarea
          id="tts-script"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_TEXT_LENGTH}
          placeholder="Start writing what you want your audience to hear…"
          className="mt-3 min-h-64 w-full resize-y rounded-xl border border-base-border bg-base-bg p-4 font-mono text-sm leading-6 text-ink-primary outline-none placeholder:text-ink-faint placeholder:font-sans focus:border-brand-violet"
        />
        <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-ink-faint">
          <span className="min-w-0">Clear, natural writing gives the best result.</span>
          <span className="font-mono">
            {text.trim().length.toLocaleString()} {characterLimit === null ? "characters · Premium access" : `/ ${characterLimit.toLocaleString()}`}
          </span>
        </div>
        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-ink-primary">Emotion / Style</legend>
          <p className="mt-1 text-xs text-ink-faint">Choose how the voice should deliver your script.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {VOICE_EMOTIONS.map((option) => (
              <button key={option} type="button" aria-pressed={emotion === option} onClick={() => applyStyle(option, expression)} className={`rounded-full border px-3 py-1.5 text-xs transition ${emotion === option ? "border-brand-violet bg-brand-violet/15 text-brand-violetSoft" : "border-base-border text-ink-muted hover:border-brand-violet/40 hover:text-ink-primary"}`}>
                {EMOTION_LABELS[option]}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {VOICE_EXPRESSIONS.map((option) => (
              <button key={option} type="button" aria-pressed={expression === option} onClick={() => applyStyle(emotion, option)} className={`rounded-full border px-3 py-1.5 text-xs transition ${expression === option ? "border-audio-mint bg-audio-mint/10 text-audio-mint" : "border-base-border text-ink-muted hover:border-audio-mint/40 hover:text-ink-primary"}`}>
                {EXPRESSION_LABELS[option]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink-faint">{EMOTION_HELP}</p>
        </fieldset>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !text.trim() || (characterLimit !== null && text.trim().length > characterLimit)}
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-violet px-4 py-3 text-sm font-medium text-white shadow-glowViolet transition hover:bg-brand-violetDim disabled:cursor-not-allowed disabled:opacity-100"
        >
          {loading ? <Equalizer label="Generating…" size="sm" /> : "Generate audio"}
        </button>
        {characterLimit !== null && text.trim().length > characterLimit && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-state-rose/10 px-3 py-2 text-sm text-state-rose">
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Free plans are limited to {characterLimit.toLocaleString()} characters per request.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-state-rose/10 px-3 py-2 text-sm text-state-rose">
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        {unavailable && <ProviderUnavailableNotice message={unavailable} />}
        <div ref={resultRef} className="mt-6">
          <Card className="p-5">
            <h2 className="font-medium text-ink-primary">Audio result</h2>
            {loading && (
              <div className="mt-4 space-y-4">
                <div className="flex h-28 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-base-border">
                  <Equalizer size="md" />
                  <p className="text-xs text-ink-faint">Rendering your audio…</p>
                </div>
              </div>
            )}
            {!loading && audioUrl && (
              <div className="mt-4 space-y-3">
                <div className="overflow-hidden rounded-xl border border-audio-mint/25 bg-audio-mint/[0.06] p-3">
                  <div className="h-10">
                    <Waveform seed={audioUrl} bars={48} className="h-full" active />
                  </div>
                  <AudioPlayer src={audioUrl} className="mt-2" />
                </div>
                <p className="flex items-center gap-1.5 text-xs text-audio-mint">
                  <IconCheck className="h-3.5 w-3.5" />
                  Generation complete.
                </p>
              </div>
            )}
            {!loading && !audioUrl && (
              <div className="mt-4 flex h-28 items-center justify-center rounded-xl border border-dashed border-base-border text-center text-xs text-ink-faint">
                Generated audio will appear here.
              </div>
            )}
          </Card>
        </div>
      </Card>
      <aside className="min-w-0 space-y-4 sm:space-y-6">
        <Card className="p-4 sm:p-5">
          <h2 className="font-medium text-ink-primary">Voice</h2>
          {selectedVoice && (
            <div className="mt-4 rounded-xl border border-brand-violet/30 bg-brand-violet/10 px-3.5 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-brand-violetSoft/70">Selected</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-brand-violetSoft">
                {selectedVoice.type === "personal" ? <IconMic className="h-4 w-4" /> : <IconWaveform className="h-4 w-4" />}
                {selectedVoice.name}
              </p>
            </div>
          )}
          {!selectedVoice && (
            <div className="mt-4 rounded-xl border border-base-border bg-base-bg px-3.5 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">Selected</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-ink-muted">
                <IconWaveform className="h-4 w-4" />
                Default voice
              </p>
            </div>
          )}
          <VoicePicker
            voiceId={voiceId}
            onSelect={setVoiceId}
            libraryVoices={libraryVoices}
            libraryQuery={libraryQuery}
            onLibraryQueryChange={setLibraryQuery}
            libraryLoading={librarySearch.isFetching}
            myVoices={myVoices}
            initialTab={selectedVoice?.type === "personal" ? "my" : "library"}
          />
          <p className="mt-3 text-xs leading-5 text-ink-faint">
            {voices.length > 0 ? "Your saved and authorized voices are available here." : "Your saved and authorized voices will appear here once ready for text-to-speech."}
          </p>
        </Card>
      </aside>
    </div>
  );
}

type VoicePickerTab = "library" | "my";
const VOICE_LIST_SEARCH_THRESHOLD = 6;

function VoiceRow({
  selected,
  onSelect,
  icon,
  name,
  subtitle,
  tone,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  name: string;
  subtitle?: string;
  tone: "violet" | "mint";
}) {
  const active =
    tone === "violet"
      ? "border-brand-violet/40 bg-brand-violet/15 text-brand-violetSoft"
      : "border-audio-mint/40 bg-audio-mint/10 text-audio-mint";
  const idle = "border-transparent text-ink-muted hover:bg-base-surface hover:text-ink-primary";
  const badge = tone === "violet" ? "bg-brand-violet/20 text-brand-violetSoft" : "bg-audio-mint/15 text-audio-mint";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={name}
      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${selected ? active : idle}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? badge : "bg-base-surface text-ink-faint"}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm ${selected ? "font-semibold" : "font-medium"}`}>{name}</span>
        {subtitle && <span className="block truncate text-[11px] text-ink-faint">{subtitle}</span>}
      </span>
      {selected && <IconCheck className="h-4 w-4 shrink-0" />}
    </button>
  );
}

function VoicePicker({
  voiceId,
  onSelect,
  libraryVoices,
  libraryQuery,
  onLibraryQueryChange,
  libraryLoading,
  myVoices,
  initialTab,
}: {
  voiceId: string;
  onSelect: (id: string) => void;
  libraryVoices: TtsVoiceOption[];
  libraryQuery: string;
  onLibraryQueryChange: (query: string) => void;
  libraryLoading: boolean;
  myVoices: TtsVoiceOption[];
  initialTab: VoicePickerTab;
}) {
  const [tab, setTab] = useState<VoicePickerTab>(initialTab);
  const [myQuery, setMyQuery] = useState("");

  const isLibrary = tab === "library";
  const list = isLibrary ? libraryVoices : myVoices;
  const query = isLibrary ? libraryQuery : myQuery;
  const normalizedQuery = query.trim().toLowerCase();
  const visible = isLibrary
    ? list
    : normalizedQuery
      ? list.filter((voice) => voice.name.toLowerCase().includes(normalizedQuery))
      : list;
  const showSearch = isLibrary || list.length > VOICE_LIST_SEARCH_THRESHOLD;

  function switchTab(next: VoicePickerTab) {
    setTab(next);
    if (next === "library") onLibraryQueryChange("");
    else setMyQuery("");
  }

  const tabClass = (target: VoicePickerTab, tone: "violet" | "mint") =>
    `flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition ${
      tab === target
        ? tone === "violet"
          ? "bg-brand-violet/15 text-brand-violetSoft shadow-sm"
          : "bg-audio-mint/15 text-audio-mint shadow-sm"
        : "text-ink-muted hover:text-ink-primary"
    }`;

  const countClass = (target: VoicePickerTab, tone: "violet" | "mint") =>
    `rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
      tab === target
        ? tone === "violet"
          ? "bg-brand-violet/25 text-brand-violetSoft"
          : "bg-audio-mint/20 text-audio-mint"
        : "bg-base-surface text-ink-faint"
    }`;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-base-border bg-base-bg">
      <div role="tablist" aria-label="Voice source" className="grid grid-cols-2 gap-1 border-b border-base-border p-1.5">
        <button type="button" role="tab" aria-selected={isLibrary} onClick={() => switchTab("library")} className={tabClass("library", "violet")}>
          <IconLibrary className="h-3.5 w-3.5" />
          Library
          <span className={countClass("library", "violet")}>{libraryVoices.length + 1}</span>
        </button>
        <button type="button" role="tab" aria-selected={!isLibrary} onClick={() => switchTab("my")} className={tabClass("my", "mint")}>
          <IconVoices className="h-3.5 w-3.5" />
          My Voices
          <span className={countClass("my", "mint")}>{myVoices.length}</span>
        </button>
      </div>

      {showSearch && (
        <div className="border-b border-base-border p-2">
          <label className="relative block">
            <span className="sr-only">Search {isLibrary ? "library" : "my"} voices</span>
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
            <input
              type="search"
              value={query}
              onChange={(event) => isLibrary ? onLibraryQueryChange(event.target.value) : setMyQuery(event.target.value)}
              placeholder={isLibrary ? "Search the voice library" : "Search my voices"}
              className="w-full rounded-lg border border-base-border bg-base-surface py-2 pl-8 pr-3 text-xs text-ink-primary outline-none placeholder:text-ink-faint focus:border-brand-violet"
            />
          </label>
        </div>
      )}

      <div className="max-h-72 space-y-1 overflow-y-auto p-2 sm:max-h-80">
        {isLibrary && !normalizedQuery && (
          <VoiceRow
            selected={voiceId === ""}
            onSelect={() => onSelect("")}
            icon={<IconWaveform className="h-4 w-4" />}
            name="Default voice"
            subtitle="Built-in"
            tone="violet"
          />
        )}

        {isLibrary && libraryVoices.length > 0 && (
          <p className="px-1 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Saved from library
          </p>
        )}

        {visible.map((voice) => (
          <VoiceRow
            key={voice.id}
            selected={voiceId === voice.id}
            onSelect={() => onSelect(voice.id)}
            icon={isLibrary ? <IconWaveform className="h-4 w-4" /> : <IconMic className="h-4 w-4" />}
            name={voice.name}
            tone={isLibrary ? "violet" : "mint"}
          />
        ))}

        {list.length > 0 && visible.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-ink-faint">No voices match your search.</p>
        )}

        {isLibrary && libraryVoices.length === 0 && (
          <div className="px-3 py-4 text-center">
            <p className="text-sm font-medium text-ink-primary">No library voices saved yet</p>
            <p className="mt-1 text-xs leading-5 text-ink-faint">
              Search the library above to find a public voice, then select it to use it in TTS.
            </p>
          </div>
        )}

        {!isLibrary && myVoices.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-sm font-medium text-ink-primary">No personal voices yet</p>
            <p className="mt-1 text-xs leading-5 text-ink-faint">Clone or record a voice to see it here.</p>
          </div>
        )}
      </div>

      {isLibrary && libraryLoading && (
        <p className="border-t border-base-border px-3 py-2 text-center text-[11px] text-ink-faint">Searching the voice library…</p>
      )}
    </div>
  );
}

const CLONE_SAMPLE_TEXT = "This is my voice sample for cloning";
const CLONE_SAMPLE_WORDS = CLONE_SAMPLE_TEXT.split(" ");
const VAD_RMS_THRESHOLD = 0.045;
const VAD_SUSTAINED_FRAMES = 4;

type CloneRecordingState = "idle" | "countdown" | "recording" | "processing";
const CLONE_COUNTDOWN_SECONDS = 3;
type SpeechListener = {
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
};

export function CloneForm() {
  const router = useRouter();
  const invalidateMyVoices = useInvalidateMyVoices();
  const input = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const noSpeechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vadFrame = useRef<number | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const speechFrames = useRef(0);
  const speechDetected = useRef(false);
  const recognition = useRef<SpeechListener | null>(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingState, setRecordingState] = useState<CloneRecordingState>("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [activeWord, setActiveWord] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState("");
  const [success, setSuccess] = useState(false);
  const uploadedVoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    if (noSpeechTimer.current) clearTimeout(noSpeechTimer.current);
    noSpeechTimer.current = null;
    if (vadFrame.current !== null) cancelAnimationFrame(vadFrame.current);
    recorder.current?.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    void audioContext.current?.close();
  }, []);

  function acceptFile(next: File | null) {
    setFile(next);
    setSuccess(false);
    setError("");
    setUnavailable("");
    if (next) requestAnimationFrame(() => uploadedVoiceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function select(event: ChangeEvent<HTMLInputElement>) {
    acceptFile(event.target.files?.[0] ?? null);
  }

  function stopTracks() {
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = null;
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    countdownTimer.current = null;
    if (vadFrame.current !== null) cancelAnimationFrame(vadFrame.current);
    vadFrame.current = null;
    recognition.current?.stop();
    recognition.current = null;
    analyser.current?.disconnect();
    analyser.current = null;
    void audioContext.current?.close();
    audioContext.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }

  function normalizeWords(value: string) {
    return value.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
  }

  // Only used to let the recording finish early once the whole sample has
  // clearly been read aloud. It intentionally no longer moves the
  // highlighted word — the word-by-word animation is driven purely by
  // startWordAnimation()'s fixed-pace timer below, not by what (or whether)
  // the user has actually said.
  function advanceFromSpeech(transcript: string) {
    const spoken = normalizeWords(transcript);
    const target = normalizeWords(CLONE_SAMPLE_TEXT);
    let matched = 0;
    while (matched < spoken.length && matched < target.length && spoken[matched] === target[matched]) matched += 1;
    if (matched >= target.length) stopRecording();
  }

  // Fixed-pace word highlight animation. Starts as soon as it's called and
  // advances one word every 1200ms regardless of microphone input — it does
  // not wait for, or react to, speech detection.
  function startWordAnimation() {
    if (progressTimer.current) return;
    setActiveWord(0);
    progressTimer.current = setInterval(() => {
      setActiveWord((current) => {
        const next = current + 1;
        if (next >= CLONE_SAMPLE_WORDS.length) {
          if (progressTimer.current) clearInterval(progressTimer.current);
          progressTimer.current = null;
          stopRecording();
          return CLONE_SAMPLE_WORDS.length - 1;
        }
        return next;
      });
    }, 1200);
  }

  // Voice-activity detection. This now only confirms that *some* sound was
  // captured (so a silent recording can be rejected on stop) — it no longer
  // triggers the word animation.
  function monitorSpeech() {
    const currentAnalyser = analyser.current;
    if (!currentAnalyser || !recorder.current || recorder.current.state !== "recording") return;
    const samples = new Uint8Array(currentAnalyser.fftSize);
    currentAnalyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const sample of samples) {
      const normalized = (sample - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / samples.length);
    if (rms >= VAD_RMS_THRESHOLD) speechFrames.current += 1;
    else speechFrames.current = Math.max(0, speechFrames.current - 1);
    if (!speechDetected.current && speechFrames.current >= VAD_SUSTAINED_FRAMES) {
      speechDetected.current = true;
    }
    vadFrame.current = requestAnimationFrame(monitorSpeech);
  }

  function reset() {
    setFile(null);
    setError("");
    setUnavailable("");
    setSuccess(false);
    setActiveWord(-1);
    setRecordingState("idle");
    setCountdown(null);
    speechDetected.current = false;
    speechFrames.current = 0;
    chunks.current = [];
    if (input.current) input.current.value = "";
  }

  // Actually starts capturing audio, wires up speech recognition / VAD for
  // validation purposes only, and kicks off the fixed-pace word animation.
  // Called once the 3-2-1 countdown reaches zero.
  function beginActiveRecording(nextRecorder: MediaRecorder, nextStream: MediaStream) {
    setRecordingState("recording");
    nextRecorder.start();
    const SpeechRecognition = (window as Window & { SpeechRecognition?: new () => SpeechListener; webkitSpeechRecognition?: new () => SpeechListener }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: new () => SpeechListener }).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const listener = new SpeechRecognition();
      listener.onresult = (event) => {
        const transcript = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ");
        advanceFromSpeech(transcript);
      };
      listener.onerror = () => { /* VAD remains the safe fallback. */ };
      recognition.current = listener;
      listener.start();
    }
    const context = new AudioContext();
    const source = context.createMediaStreamSource(nextStream);
    const nextAnalyser = context.createAnalyser();
    nextAnalyser.fftSize = 2048;
    source.connect(nextAnalyser);
    audioContext.current = context;
    analyser.current = nextAnalyser;
    vadFrame.current = requestAnimationFrame(monitorSpeech);
    noSpeechTimer.current = setTimeout(() => {
      if (!speechDetected.current && recorder.current?.state === "recording") {
        setError("No speech detected. Please try again.");
        recorder.current.stop();
      }
    }, 10000);

    // Word-by-word zoom animation starts right away, on its own fixed pace —
    // it does not wait for the VAD or speech recognition to report anything.
    startWordAnimation();
  }

  async function startRecording() {
    if (recording || loading) return;
    setError("");
    setUnavailable("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Microphone recording is not supported in this browser.");
      }
      const nextStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const nextRecorder = new MediaRecorder(nextStream);
      stream.current = nextStream;
      recorder.current = nextRecorder;
      chunks.current = [];
      speechDetected.current = false;
      speechFrames.current = 0;
      setRecording(true);
      setRecordingState("countdown");
      setActiveWord(-1);
      nextRecorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.current.push(event.data); };
      nextRecorder.onstop = () => {
        const hadSpeech = speechDetected.current;
        const audioBlob = new Blob(chunks.current, { type: nextRecorder.mimeType || "audio/webm" });
        stopTracks();
        setRecording(false);
        setRecordingState("idle");
        setActiveWord(-1);
        if (!hadSpeech) {
          chunks.current = [];
          setError("No speech detected. Please try again and speak into the microphone.");
          return;
        }
        const audio = new File([audioBlob], "voice-clone.webm", { type: audioBlob.type || "audio/webm" });
        acceptFile(audio);
        setRecordingState("processing");
        void handleClone(audio);
      };

      // Show a 3-2-1 countdown before anything starts. The word animation
      // (and the actual recording) only begins once it reaches zero — this
      // is a fixed, deterministic delay, not something that waits on the
      // user to speak.
      let secondsLeft = CLONE_COUNTDOWN_SECONDS;
      setCountdown(secondsLeft);
      countdownTimer.current = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft <= 0) {
          if (countdownTimer.current) clearInterval(countdownTimer.current);
          countdownTimer.current = null;
          setCountdown(null);
          beginActiveRecording(nextRecorder, nextStream);
        } else {
          setCountdown(secondsLeft);
        }
      }, 1000);
    } catch (recordingError) {
      stopTracks();
      setRecording(false);
      setActiveWord(-1);
      setError(recordingError instanceof DOMException && recordingError.name === "NotAllowedError" ? "Microphone permission was denied. Allow microphone access to record a clone." : recordingError instanceof Error ? recordingError.message : "Unable to access the microphone.");
    }
  }

  function stopRecording() {
    if (recordingState === "countdown") {
      // Cancelling during the countdown: nothing has actually started
      // recording yet, so just tear everything down and reset.
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      countdownTimer.current = null;
      setCountdown(null);
      stopTracks();
      setRecording(false);
      setRecordingState("idle");
      return;
    }
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function handleClone(fileOverride?: File) {
    const trimmedName = name.trim();
    const selectedFile = fileOverride ?? file;
    if (!selectedFile) { setError("Choose an audio sample to clone."); return; }

    setLoading(true);
    setError("");
    setUnavailable("");
    setSuccess(false);

    try {
      const body = new FormData();
      if (trimmedName) body.set("name", trimmedName);
      body.set("audio", selectedFile);

      const response = await fetch("/api/voices/clone", { method: "POST", body });

      if (!response.ok) {
        let message = "Unable to clone this voice. Please try again.";
        let code = "";
        try { const data = await response.json() as { error?: string; code?: string }; if (data.error) message = data.error; if (data.code) code = data.code; } catch { /* Use the default message. */ }
        if (code === "provider_unavailable") setUnavailable(message); else setError(message);
        return;
      }

      const cloned = await response.json() as { id?: string; name?: string };
      if (!cloned.id) throw new Error("The cloned voice was saved without an ID.");
      setSuccess(true);
      setName("");
      setFile(null);
      if (input.current) input.current.value = "";
      try {
        const uid = await getTtsUserId();
        if (uid) await invalidateMyVoices(uid);
      } catch {
        /* Best-effort invalidation; next TTS mount will refetch via useMyVoices enabled after auth. */
      }
      await new Promise((resolve) => setTimeout(resolve, 1750));
      router.push(`/dashboard/tts?voice=${encodeURIComponent(cloned.id)}`);
    } catch {
      setError("A network error occurred. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setRecordingState("idle");
    }
  }

  return (
    <Card className="mx-auto max-w-3xl p-5 sm:p-7">
      <label className="block text-sm font-medium text-ink-primary">
        Voice name
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setSuccess(false); }}
          maxLength={100}
          placeholder="Optional, e.g. My narration voice"
          className="mt-2"
        />
      </label>
      <input
        ref={input}
        onChange={select}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/webm,audio/ogg"
        className="hidden"
      />
      <div className="mt-6 rounded-2xl border border-audio-mint/25 bg-audio-mint/[0.05] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-ink-primary"><IconMic className="h-4 w-4 text-audio-mint" />Record with microphone</p>
            <p className="mt-1 text-xs leading-5 text-ink-faint">Read the sample aloud. Your actual microphone recording will be sent for cloning.</p>
          </div>
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${recording ? "animate-pulse bg-state-rose" : "bg-ink-faint/40"}`} aria-hidden="true" />
        </div>
        <div className="mt-5 rounded-xl border border-base-border bg-base-bg p-4" aria-live="polite">
          {recordingState === "countdown" ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">Get ready</p>
              <span key={countdown} className="animate-pulse text-6xl font-bold tabular-nums text-audio-mint transition-transform duration-300">
                {countdown}
              </span>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">Read this sample</p>
              <p className="flex flex-wrap gap-x-2 gap-y-2 text-lg leading-8 text-ink-muted">
                {CLONE_SAMPLE_WORDS.map((word, index) => (
                  <span key={`${word}-${index}`} className={`inline-block transition duration-300 ${index === activeWord ? "scale-110 font-semibold text-audio-mint" : index < activeWord ? "text-ink-faint" : "text-ink-primary"}`}>{word}</span>
                ))}
              </p>
              {recording && (
                <p className="mt-4 border-t border-base-border pt-3 text-sm font-medium text-audio-mint">
                  Listening…
                </p>
              )}
            </>
          )}
        </div>
        <button type="button" onClick={recording ? stopRecording : startRecording} disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-audio-mint/40 bg-audio-mint/10 px-4 py-3 text-sm font-medium text-audio-mint transition hover:bg-audio-mint/20 disabled:cursor-not-allowed disabled:opacity-50">
          <IconMic className="h-4 w-4" />
          {recording
            ? recordingState === "countdown" ? "Cancel" : "Finish recording"
            : recordingState === "processing" || loading ? "Creating your cloned voice…" : "Record voice sample"}
        </button>
      </div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const dropped = e.dataTransfer.files?.[0]; if (dropped) acceptFile(dropped); }}
        className={`relative mt-6 flex min-h-52 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed p-6 text-center transition ${
          dragOver ? "border-brand-violet bg-brand-violet/10" : "border-brand-violet/40 bg-brand-violet/5 hover:bg-brand-violet/10"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-aurora-violet opacity-60" />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-brand-violet/30 bg-base-card text-brand-violetSoft">
          <IconUpload className="h-5 w-5" />
        </span>
        <span className="relative mt-3 font-medium text-ink-primary">Choose or drop an audio sample</span>
        <span className="relative mt-2 text-xs text-ink-faint">Only upload audio you have the rights to clone.</span>
      </button>
      <p className="mt-3 text-xs text-ink-faint">Supported: WAV, MP3, M4A, OGG, and WEBM, up to 20MB. For best results, use a clean 30–60 second recording.</p>
      {file && (
        <div ref={uploadedVoiceRef} className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-base-border bg-base-bg p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-audio-mint/30 bg-audio-mint/10 text-audio-mint">
              <IconMic className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-primary">{file.name}</p>
              <p className="mt-1 text-xs text-ink-faint">{Math.ceil(file.size / 1024)} KB · Ready to clone</p>
            </div>
          </div>
          <button type="button" onClick={reset} className="shrink-0 text-xs text-ink-muted hover:text-ink-primary">Clear</button>
        </div>
      )}
      <button
        type="button"
        onClick={() => void handleClone()}
        disabled={loading || recording || !file}
        className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-violet px-4 py-3 text-sm font-medium text-white shadow-glowViolet transition hover:bg-brand-violetDim disabled:cursor-not-allowed disabled:opacity-100"
      >
          {loading ? <Equalizer label="Cloning your voice…" size="sm" /> : "Clone voice"}
      </button>
      {loading && (
        <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-base-border p-6">
          <p className="text-xs text-ink-faint">Your voice is being cloned — this usually takes a moment.</p>
        </div>
      )}
      {error && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-state-rose/10 px-3 py-2 text-sm text-state-rose">
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
      {unavailable && <ProviderUnavailableNotice message={unavailable} />}
      {success && (
        <p role="status" className="mt-3 flex items-center gap-2 rounded-lg bg-audio-mint/10 px-3 py-2 text-sm text-audio-mint">
          <IconCheck className="h-4 w-4 shrink-0" />
          Voice cloned successfully. Your cloned voice is being saved to My Voices.
        </p>
      )}
    </Card>
  );
}
const MAX_INSTRUCTION_LENGTH = 2000;
const MAX_REFERENCE_TEXT_LENGTH = 150;

type VoiceCandidate = {
  id: string;
  index: number;
  audioBase64: string;
  sampleRate: number;
  durationMs: number;
  text: string | null;
  instruct: string | null;
  language: string | null;
};

export function DesignForm() {
  const router = useRouter();
  const [instruction, setInstruction] = useState("Warm, professional female voice with a calm and friendly tone.");
  const [referenceText, setReferenceText] = useState("");
  const [count, setCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState("");
  const [candidates, setCandidates] = useState<VoiceCandidate[]>([]);

  async function handleGenerate() {
    const trimmed = instruction.trim();
    if (!trimmed) { setError("Describe the voice you want to design."); return; }

    setLoading(true);
    setError("");
    setUnavailable("");
    setCandidates([]);

    try {
      const response = await fetch("/api/voices/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: trimmed,
          ...(referenceText.trim() ? { referenceText: referenceText.trim() } : {}),
          n: count,
        }),
      });

      if (!response.ok) {
        let message = "Unable to design a voice right now. Please try again.";
        let code = "";
        try { const data = await response.json() as { error?: string; code?: string }; if (data.error) message = data.error; if (data.code) code = data.code; } catch { /* Use the default message. */ }
        if (code === "provider_unavailable") setUnavailable(message); else setError(message);
        return;
      }

      const data = await response.json() as { candidates: VoiceCandidate[] };
      setCandidates(data.candidates);
    } catch {
      setError("A network error occurred. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Card className="p-5 sm:p-6">
        <label className="flex items-center gap-2 text-sm font-medium text-ink-primary">
          <IconSparkle className="h-4 w-4 text-brand-violetSoft" />
          Describe the voice
        </label>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          maxLength={MAX_INSTRUCTION_LENGTH}
          className="mt-2 min-h-44 w-full resize-y rounded-xl border border-base-border bg-base-bg p-4 text-sm text-ink-primary outline-none focus:border-brand-violet"
        />
        <div className="mt-1 text-right text-xs text-ink-faint">{instruction.length.toLocaleString()} / {MAX_INSTRUCTION_LENGTH.toLocaleString()}</div>

        <label className="mt-4 block text-sm font-medium text-ink-primary">
          Preview line <span className="font-normal text-ink-faint">(optional)</span>
          <input
            value={referenceText}
            onChange={(e) => setReferenceText(e.target.value)}
            maxLength={MAX_REFERENCE_TEXT_LENGTH}
            placeholder="Text the candidates will read aloud"
            className="mt-2"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-ink-primary">
          Candidates
          <Select
            value={String(count)}
            onChange={(v) => setCount(Number(v))}
            options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
            className="mt-2"
          />
        </label>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !instruction.trim()}
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-violet px-4 py-3 text-sm font-medium text-white shadow-glowViolet transition hover:bg-brand-violetDim disabled:cursor-not-allowed disabled:opacity-100"
        >
          {loading ? <Equalizer label="Designing…" size="sm" /> : "Generate voice candidates"}
        </button>
        {error && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-state-rose/10 px-3 py-2 text-sm text-state-rose">
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        {unavailable && <ProviderUnavailableNotice message={unavailable} />}
      </Card>
      <Card className="p-5">
        <h2 className="font-medium text-ink-primary">Voice candidates</h2>
        {loading && (
          <div className="mt-4 flex min-h-72 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-base-border p-6">
            <Equalizer size="md" />
            <p className="text-sm text-ink-faint">Shaping voice candidates…</p>
          </div>
        )}
        {!loading && candidates.length === 0 && (
          <div className="mt-4 flex min-h-72 items-center justify-center rounded-xl border border-dashed border-base-border p-6 text-center text-sm leading-6 text-ink-faint">
            Your generated voice candidates will appear here.
          </div>
        )}
        {!loading && candidates.length > 0 && (
          <div className="mt-4 space-y-4">
            {candidates.map((candidate) => (
              <DesignCandidateCard key={candidate.id} candidate={candidate} onSaved={() => router.refresh()} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function DesignCandidateCard({ candidate, onSaved }: { candidate: VoiceCandidate; onSaved: () => void }) {
  const invalidateMyVoices = useInvalidateMyVoices();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState("");
  const [saved, setSaved] = useState(false);
  const audioSrc = `data:audio/wav;base64,${candidate.audioBase64}`;

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Name this voice before saving."); return; }

    setSaving(true);
    setError("");
    setUnavailable("");

    try {
      const response = await fetch("/api/voices/design/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, audioBase64: candidate.audioBase64 }),
      });

      if (!response.ok) {
        let message = "Unable to save this voice. Please try again.";
        let code = "";
        try { const data = await response.json() as { error?: string; code?: string }; if (data.error) message = data.error; if (data.code) code = data.code; } catch { /* Use the default message. */ }
        if (code === "provider_unavailable") setUnavailable(message); else setError(message);
        return;
      }

      setSaved(true);
      try {
        const uid = await getTtsUserId();
        if (uid) await invalidateMyVoices(uid);
      } catch {
        /* Best-effort invalidation. */
      }
      onSaved();
    } catch {
      setError("A network error occurred. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-base-border bg-base-bg p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium text-ink-primary">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-violet/15 text-xs text-brand-violetSoft">{candidate.index + 1}</span>
          Candidate {candidate.index + 1}
        </p>
      </div>
      {candidate.text && <p className="mt-2 text-xs italic text-ink-faint">&ldquo;{candidate.text}&rdquo;</p>}
      <div className="mt-3 overflow-hidden rounded-lg border border-base-border bg-base-card p-2.5">
        <div className="h-8">
          <Waveform seed={candidate.id} bars={36} className="h-full" />
        </div>
        <AudioPlayer src={audioSrc} className="mt-1.5" />
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setSaved(false); }}
          maxLength={100}
          placeholder="Name this voice"
          disabled={saved}
          className="min-w-0 flex-1 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || saved || !name.trim()}
          className="shrink-0 rounded-lg bg-brand-violet px-3 py-2 text-xs font-medium text-white transition hover:bg-brand-violetDim disabled:cursor-not-allowed disabled:opacity-100"
        >
          {saved ? "Saved" : saving ? "Saving…" : "Use this voice"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-state-rose">{error}</p>}
      {unavailable && <ProviderUnavailableNotice message={unavailable} />}
      {saved && <p role="status" className="mt-2 flex items-center gap-1.5 text-xs text-audio-mint"><IconCheck className="h-3.5 w-3.5" />Saved to My Voices.</p>}
    </div>
  );
}
