const FISH_TTS_URL = "https://api.fish.audio/v1/tts";
export class FishAudioError extends Error { constructor(message: string, public readonly status: number) { super(message); } }
export type SpeechRequest = { text: string; model: string; referenceId?: string };
export type SpeechResult = { audio: ArrayBuffer; contentType: string };
export async function generateSpeech({ text, model, referenceId }: SpeechRequest): Promise<SpeechResult> {
  const apiKey = process.env.FISH_API_KEY;
  if (!apiKey) throw new FishAudioError("Text-to-speech is not configured on this server.", 500);
  let response: Response;
  try { response = await fetch(FISH_TTS_URL, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", model }, body: JSON.stringify({ text, ...(referenceId ? { reference_id: referenceId } : {}), format: "mp3", normalize: true }) }); } catch { throw new FishAudioError("The voice service could not be reached. Please try again.", 502); }
  if (!response.ok) { let message = "Fish Audio could not generate speech."; try { const body = await response.json() as { message?: string }; if (body.message) message = body.message; } catch { /* Keep a safe, generic failure message. */ } throw new FishAudioError(message, 502); }
  return { audio: await response.arrayBuffer(), contentType: response.headers.get("content-type") || "audio/mpeg" };
}
