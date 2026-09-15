"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const AudioPlaybackContext = createContext<((audio: HTMLAudioElement) => void) | null>(null);

export function AudioPlaybackProvider({ children }: { children: ReactNode }) {
  const activeAudio = useRef<HTMLAudioElement | null>(null);

  function register(audio: HTMLAudioElement) {
    if (activeAudio.current && activeAudio.current !== audio) {
      activeAudio.current.pause();
    }
    activeAudio.current = audio;
  }

  return <AudioPlaybackContext.Provider value={register}>{children}</AudioPlaybackContext.Provider>;
}

export function AudioPlayer({ src, className = "" }: { src: string; className?: string }) {
  const register = useContext(AudioPlaybackContext);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !register) return;
    const handlePlay = () => register(audio);
    audio.addEventListener("play", handlePlay);
    return () => audio.removeEventListener("play", handlePlay);
  }, [register]);

  return (
    <div className={className}>
      <audio
        ref={audioRef}
        controls
        src={src}
        className="w-full"
        onError={() => setError(true)}
        onLoadedData={() => setError(false)}
      >
        Your browser does not support the audio element.
      </audio>
      {error && <p className="mt-1 text-xs text-state-rose">This audio preview could not be loaded.</p>}
    </div>
  );
}

