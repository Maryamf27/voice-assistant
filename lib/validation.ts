const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export type Credentials = { email: string; password: string };
export type Registration = Credentials & { name: string; confirmPassword: string };
export function validateCredentials(input: Partial<Credentials>): string | null {
  if (!input.email || !emailPattern.test(input.email.trim())) return "Enter a valid email address.";
  if (!input.password || input.password.length < 8) return "Password must be at least 8 characters.";
  return null;
}
export function validateRegistration(input: Partial<Registration>): string | null {
  if (!input.name || input.name.trim().length < 2 || input.name.trim().length > 80) return "Name must be between 2 and 80 characters.";
  const credentialsError = validateCredentials(input); if (credentialsError) return credentialsError;
  if (input.password !== input.confirmPassword) return "Passwords do not match.";
  return null;
}

export const MAX_VOICE_NAME_LENGTH = 100;
export const MAX_CLONE_AUDIO_BYTES = 20 * 1024 * 1024;
const ALLOWED_CLONE_AUDIO_TYPES = new Set([
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave",
  "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/webm", "audio/ogg",
]);

export function validateVoiceName(name: unknown): string | null {
  if (typeof name !== "string" || !name.trim()) return "Enter a name for this voice.";
  if (name.trim().length > MAX_VOICE_NAME_LENGTH) return `Voice name must be ${MAX_VOICE_NAME_LENGTH} characters or fewer.`;
  return null;
}

export function validateCloneAudioFile(file: unknown): string | null {
  if (!(file instanceof File) || file.size === 0) return "Upload an audio sample to clone.";
  if (!ALLOWED_CLONE_AUDIO_TYPES.has(file.type)) return "Upload a WAV, MP3, M4A, OGG, or WEBM audio file.";
  if (file.size > MAX_CLONE_AUDIO_BYTES) return `Audio file must be ${MAX_CLONE_AUDIO_BYTES / (1024 * 1024)}MB or smaller.`;
  return null;
}

export const MAX_VOICE_INSTRUCTION_LENGTH = 2000;
export const MAX_VOICE_REFERENCE_TEXT_LENGTH = 150;
export const MAX_VOICE_DESIGN_CANDIDATES = 4;
export const MAX_DESIGN_AUDIO_BYTES = MAX_CLONE_AUDIO_BYTES;

export function validateVoiceInstruction(instruction: unknown): string | null {
  if (typeof instruction !== "string" || !instruction.trim()) return "Describe the voice you want to design.";
  if (instruction.trim().length > MAX_VOICE_INSTRUCTION_LENGTH) return `Description must be ${MAX_VOICE_INSTRUCTION_LENGTH.toLocaleString()} characters or fewer.`;
  return null;
}

export function validateVoiceReferenceText(referenceText: unknown): string | null {
  if (referenceText === undefined || referenceText === null || referenceText === "") return null;
  if (typeof referenceText !== "string") return "The preview line is invalid.";
  if (referenceText.length > MAX_VOICE_REFERENCE_TEXT_LENGTH) return `The preview line must be ${MAX_VOICE_REFERENCE_TEXT_LENGTH} characters or fewer.`;
  return null;
}

export function validateDesignCandidateCount(count: unknown): string | null {
  if (count === undefined) return null;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > MAX_VOICE_DESIGN_CANDIDATES) {
    return `Choose between 1 and ${MAX_VOICE_DESIGN_CANDIDATES} candidates.`;
  }
  return null;
}

export const MAX_VOICE_SEARCH_QUERY_LENGTH = 100;
export const VOICE_SEARCH_PAGE_SIZE = 12;
export const MAX_VOICE_SEARCH_PAGE = 50;
export const MAX_FISH_REFERENCE_ID_LENGTH = 100;

export function validateVoiceSearchQuery(query: unknown): string | null {
  if (query === undefined || query === null || query === "") return null;
  if (typeof query !== "string") return "The search query is invalid.";
  if (query.length > MAX_VOICE_SEARCH_QUERY_LENGTH) return `Search must be ${MAX_VOICE_SEARCH_QUERY_LENGTH} characters or fewer.`;
  return null;
}

export function validateVoiceSearchPage(page: unknown): string | null {
  if (typeof page !== "number" || !Number.isInteger(page) || page < 1 || page > MAX_VOICE_SEARCH_PAGE) {
    return "That page number is invalid.";
  }
  return null;
}

export function validateFishReferenceId(id: unknown): string | null {
  if (typeof id !== "string" || !id.trim()) return "Select a voice to save.";
  if (id.trim().length > MAX_FISH_REFERENCE_ID_LENGTH) return "That voice reference is invalid.";
  return null;
}
