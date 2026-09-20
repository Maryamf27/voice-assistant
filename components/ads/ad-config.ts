export const WAITING_AD_DELAY_MS = 2500;
export const AD_CLOSE_COOLDOWN_MS = 60_000;
export const MAX_ADS_PER_SESSION = 5;

export type AdPlacement = "dashboard" | "tts" | "voice-library" | "generation-waiting";

export const AD_COPY: Record<AdPlacement, { eyebrow: string; title: string; body: string; action: string }> = {
  dashboard: { eyebrow: "Sponsored", title: "Make every word sound intentional", body: "Explore a focused voice workflow built for scripts, samples, and repeatable results.", action: "Explore Voice Studio" },
  tts: { eyebrow: "Advertisement", title: "Your voice workspace, uninterrupted", body: "Keep your scripts, voices, and audio results together in one calm workspace.", action: "Learn more" },
  "voice-library": { eyebrow: "Sponsored", title: "Build a voice library that works", body: "Save the voices you use most and keep your next generation close at hand.", action: "Explore Voice Studio" },
  "generation-waiting": { eyebrow: "Advertisement", title: "Your audio is being prepared", body: "Generation is still running. You can keep working while your result is rendered.", action: "Voice Studio" },
};
