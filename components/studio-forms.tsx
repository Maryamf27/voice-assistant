"use client";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, ProviderUnavailableNotice, Equalizer, Waveform } from "@/components/ui";
import { Select } from "@/components/select";
import { IconUpload, IconCheck, IconAlert, IconWaveform, IconMic, IconSparkle } from "@/components/icons";
import { AudioPlayer } from "@/components/audio-playback";
import { FREE_TTS_CHARACTER_LIMIT, MAX_TTS_REQUEST_LENGTH } from "@/lib/entitlement-constants";

const MAX_TEXT_LENGTH = MAX_TTS_REQUEST_LENGTH;

type TtsVoiceOption = { id: string; name: string; type: string };
export function TtsForm({ voices = [], model = null, initialVoiceId = "", characterLimit = FREE_TTS_CHARACTER_LIMIT }: { voices?: TtsVoiceOption[]; model?: string | null; initialVoiceId?: string; characterLimit?: number | null }) {
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState(initialVoiceId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

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
        body: JSON.stringify({ text: trimmed, ...(voiceId ? { voiceId } : {}) }),
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
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
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
        <div className="mt-2 flex justify-between text-xs text-ink-faint">
          <span>Clear, natural writing gives the best result.</span>
          <span className="font-mono">
            {text.trim().length.toLocaleString()} {characterLimit === null ? "characters · Premium access" : `/ ${characterLimit.toLocaleString()}`}
          </span>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !text.trim() || (characterLimit !== null && text.trim().length > characterLimit)}
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-violet px-4 py-3 text-sm font-medium text-white shadow-glowViolet transition hover:bg-brand-violetDim disabled:cursor-not-allowed disabled:opacity-60"
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
              <div className="mt-4 flex h-28 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-base-border">
                <Equalizer size="md" />
                <p className="text-xs text-ink-faint">Rendering your audio…</p>
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
      <aside className="space-y-6">
        <Card className="p-5">
          <h2 className="font-medium text-ink-primary">Voice</h2>
          <Select
            value={voiceId}
            onChange={setVoiceId}
            disabled={voices.length === 0}
            options={[
              { value: "", label: "Default voice", group: "Default" },
              ...voices.filter((voice) => voice.type === "personal").map((voice) => ({ value: voice.id, label: voice.name, group: "My Voices" })),
              ...voices.filter((voice) => voice.type === "library").map((voice) => ({ value: voice.id, label: voice.name, group: "Library Voices" })),
            ]}
            aria-label="Voice"
            className="mt-4"
          />
          <p className="mt-3 text-xs leading-5 text-ink-faint">
            {voices.length > 0 ? "Your saved and authorized voices are available here." : "Your saved and authorized voices will appear here once ready for text-to-speech."}
          </p>
        </Card>
        <Card className="p-5">
          <h2 className="font-medium text-ink-primary">Model</h2>
          <div className="mt-4 rounded-xl border border-brand-violet/30 bg-brand-violet/10 p-3">
            <p className="text-sm font-medium text-brand-violetSoft">{model ?? "Not configured"}</p>
            <p className="mt-1 text-xs text-brand-violetSoft/70">{model ? "Selected automatically for this workspace." : "Set FISH_TTS_MODEL on the server to enable generation."}</p>
          </div>
        </Card>
      </aside>
    </div>
  );
}

const CLONE_SAMPLE_TEXT = "This is my voice sample for cloning";
const CLONE_SAMPLE_WORDS = CLONE_SAMPLE_TEXT.split(" ");
const VAD_RMS_THRESHOLD = 0.045;
const VAD_SUSTAINED_FRAMES = 4;

type CloneRecordingState = "idle" | "waiting_for_speech" | "recording" | "processing";
type SpeechListener = {
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
};

export function CloneForm() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
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
  const [activeWord, setActiveWord] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState("");
  const [success, setSuccess] = useState(false);
  const uploadedVoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
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

  function advanceFromSpeech(transcript: string) {
    const spoken = normalizeWords(transcript);
    const target = normalizeWords(CLONE_SAMPLE_TEXT);
    let matched = 0;
    while (matched < spoken.length && matched < target.length && spoken[matched] === target[matched]) matched += 1;
    if (matched > 0) {
      setRecordingState("recording");
      setActiveWord(Math.min(matched - 1, CLONE_SAMPLE_WORDS.length - 1));
      if (matched >= target.length) stopRecording();
    }
  }

  function startWordAnimation() {
    if (progressTimer.current || !speechDetected.current) return;
    setRecordingState("recording");
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
      startWordAnimation();
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
    speechDetected.current = false;
    speechFrames.current = 0;
    chunks.current = [];
    if (input.current) input.current.value = "";
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
      setRecordingState("waiting_for_speech");
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
    } catch (recordingError) {
      stopTracks();
      setRecording(false);
      setActiveWord(-1);
      setError(recordingError instanceof DOMException && recordingError.name === "NotAllowedError" ? "Microphone permission was denied. Allow microphone access to record a clone." : recordingError instanceof Error ? recordingError.message : "Unable to access the microphone.");
    }
  }

  function stopRecording() {
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
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">Read this sample</p>
          <p className="flex flex-wrap gap-x-2 gap-y-2 text-lg leading-8 text-ink-muted">
            {CLONE_SAMPLE_WORDS.map((word, index) => (
              <span key={`${word}-${index}`} className={`inline-block transition duration-300 ${index === activeWord ? "scale-110 font-semibold text-audio-mint" : index < activeWord ? "text-ink-faint" : "text-ink-primary"}`}>{word}</span>
            ))}
          </p>
          {recording && (
            <p className="mt-4 border-t border-base-border pt-3 text-sm font-medium text-audio-mint">
              {recordingState === "waiting_for_speech" ? "Trying to listen…" : "Listening…"}
            </p>
          )}
        </div>
        <button type="button" onClick={recording ? stopRecording : startRecording} disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-audio-mint/40 bg-audio-mint/10 px-4 py-3 text-sm font-medium text-audio-mint transition hover:bg-audio-mint/20 disabled:cursor-not-allowed disabled:opacity-50">
          <IconMic className="h-4 w-4" />{recording ? "Finish recording" : recordingState === "processing" || loading ? "Creating your cloned voice…" : "Record voice sample"}
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
        className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-violet px-4 py-3 text-sm font-medium text-white shadow-glowViolet transition hover:bg-brand-violetDim disabled:cursor-not-allowed disabled:opacity-60"
      >
          {loading ? <Equalizer label="Cloning your voice…" size="sm" /> : "Clone voice"}
      </button>
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
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-violet px-4 py-3 text-sm font-medium text-white shadow-glowViolet transition hover:bg-brand-violetDim disabled:cursor-not-allowed disabled:opacity-60"
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
          <div className="mt-4 flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-base-border p-6">
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
      onSaved();
    } catch {
      setError("A network error occurred. Please check your connection and try again.");
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
          className="shrink-0 rounded-lg bg-brand-violet px-3 py-2 text-xs font-medium text-white transition hover:bg-brand-violetDim disabled:cursor-not-allowed disabled:opacity-60"
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
