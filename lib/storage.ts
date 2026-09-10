import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const BUCKET = "generated-audio";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour 

export class StorageError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}
function extensionForContentType(contentType: string): string {
  const type = contentType.toLowerCase();
  if (type.includes("wav")) return "wav";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("webm")) return "webm";
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac")) return "m4a";
  if (type.includes("flac")) return "flac";
  return "mp3";
}

export type UploadAudioInput = {
  supabase: SupabaseClient<Database>;
  userId: string;
  generationId: string;
  data: ArrayBuffer | Buffer;
  contentType: string;
};

export type UploadAudioResult = { path: string };
export async function uploadAudio({ supabase, userId, generationId, data, contentType }: UploadAudioInput): Promise<UploadAudioResult> {
  const extension = extensionForContentType(contentType);
  const path = `${userId}/${generationId}.${extension}`;
  const body = Buffer.isBuffer(data) ? data : Buffer.from(data);

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType, upsert: false });
  if (error) {
    console.error("Storage upload failed", error);
    throw new StorageError("The generated audio could not be saved. Please try again.", 502);
  }

  return { path };
}

export async function getAudioUrl(supabase: SupabaseClient<Database>, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.error("Could not create a signed audio URL", error);
    return null;
  }
  return data.signedUrl;
}

export async function deleteAudio(supabase: SupabaseClient<Database>, path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error("Could not delete stored audio", error);
}
