export function isVoiceDesignEnabled(): boolean {
  return process.env.VOICE_DESIGN_ENABLED === "true";
}
