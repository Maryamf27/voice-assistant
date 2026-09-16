export const FREE_TTS_CHARACTER_LIMIT = 1000;
export const MAX_TTS_REQUEST_LENGTH = 5000;

export function getTTSCharacterLimit(plan: "free" | "premium"): number | null {
  return plan === "premium" ? null : FREE_TTS_CHARACTER_LIMIT;
}

export function countTTSCharacters(text: string): number {
  return text.length;
}
