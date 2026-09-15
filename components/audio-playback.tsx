"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { IconPause, IconPlay } from "@/components/icons";

type RegisterAudio = (audio: HTMLAudioElement) => void;
const AudioPlaybackContext = createContext<RegisterAudio | null>(null);

export function AudioPlaybackProvider({ children }: { children: ReactNode }) {
  const activeAudio = useRef<HTMLAudioElement | null>(null);

  function register(audio: HTMLAudioElement) {
    if (activeAudio.current && activeAudio.current !== audio) activeAudio.current.pause();
    activeAudio.current = audio;
  }

  return <AudioPlaybackContext.Provider value={register}>{children}</AudioPlaybackContext.Provider>;
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function AudioPlayer({ src, className = "" }: { src: string; className?: string }) {
  const register = useContext(AudioPlaybackContext);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const loaded = () => { setDuration(audio.duration); setLoading(false); setError(false); };
    const handlePlay = () => { setPlaying(true); register?.(audio); };
    const handlePause = () => setPlaying(false);
    const handleEnded = () => { setPlaying(false); setCurrentTime(0); };
    const handleError = () => { setLoading(false); setError(true); };
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", loaded);
    audio.addEventListener("canplay", loaded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", loaded);
      audio.removeEventListener("canplay", loaded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [register]);

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || error) return;
    if (audio.paused) void audio.play().catch(() => setError(true));
    else audio.pause();
  }

  function seek(value: string) {
    const nextTime = Number(value);
    if (audioRef.current) audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  function changeVolume(value: string) {
    const nextVolume = Number(value);
    setVolume(nextVolume);
    if (audioRef.current) audioRef.current.volume = nextVolume;
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" className="sr-only" aria-hidden="true" />
      {error ? <p className="text-xs text-state-rose">This audio preview could not be loaded.</p> : (
        <div className="flex min-w-0 items-center gap-3 rounded-lg border border-base-border bg-base-card/70 px-3 py-2.5">
          <button type="button" onClick={togglePlayback} disabled={loading} aria-label={playing ? "Pause audio" : "Play audio"} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-violet text-white transition hover:bg-brand-violetDim disabled:cursor-wait disabled:opacity-60">
            {playing ? <IconPause className="size-4" /> : <IconPlay className="size-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <input aria-label="Seek audio" type="range" min="0" max={duration || 0} step="0.01" value={currentTime} onChange={(event) => seek(event.target.value)} disabled={loading || !duration} className="h-1.5 w-full cursor-pointer accent-audio-mint disabled:cursor-wait" />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-faint"><span>{loading ? "Loading…" : formatTime(currentTime)}</span><span>{loading ? "—" : formatTime(duration)}</span></div>
          </div>
          <label className="flex shrink-0 items-center gap-1.5" aria-label="Volume">
            <span className="text-xs text-audio-mint">VOL</span>
            <input aria-label="Volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => changeVolume(event.target.value)} className="w-14 cursor-pointer accent-brand-violet sm:w-20" />
          </label>
        </div>
      )}
    </div>
  );
}

