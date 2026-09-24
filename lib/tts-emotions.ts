export const VOICE_EMOTIONS = ["neutral", "happy", "sad", "confident", "excited", "angry"] as const;
export type VoiceEmotion = (typeof VOICE_EMOTIONS)[number];

export const VOICE_EXPRESSIONS = ["none", "laughing", "whispering", "shouting"] as const;
export type VoiceExpression = (typeof VOICE_EXPRESSIONS)[number];

const emotionInstructions: Record<Exclude<VoiceEmotion, "neutral">, string> = {
  happy: "speaking happily",
  sad: "speaking sadly",
  confident: "speaking confidently",
  excited: "speaking excitedly",
  angry: "speaking angrily",
};

const expressionInstructions: Record<Exclude<VoiceExpression, "none">, string> = {
  laughing: "laughing",
  whispering: "whispering",
  shouting: "shouting",
};

export function isVoiceEmotion(value: unknown): value is VoiceEmotion {
  return typeof value === "string" && (VOICE_EMOTIONS as readonly string[]).includes(value);
}

export function isVoiceExpression(value: unknown): value is VoiceExpression {
  return typeof value === "string" && (VOICE_EXPRESSIONS as readonly string[]).includes(value);
}

export function buildExpressionText(text: string, emotion: VoiceEmotion, expression: VoiceExpression): string {
  const instructions: string[] = [];
  if (emotion !== "neutral") instructions.push(emotionInstructions[emotion]);
  if (expression !== "none") instructions.push(expressionInstructions[expression]);
  return instructions.length > 0 ? `${instructions.map((instruction) => `[${instruction}]`).join(" ")} ${text}` : text;
}

export const EMOTION_LABELS: Record<VoiceEmotion, string> = {
  neutral: "Neutral",
  happy: "Happy",
  sad: "Sad",
  confident: "Confident",
  excited: "Excited",
  angry: "Angry",
};

export const EXPRESSION_LABELS: Record<VoiceExpression, string> = {
  none: "None",
  laughing: "Laughing",
  whispering: "Whispering",
  shouting: "Shouting",
};

export const EMOTION_HELP = "S2 uses bracketed natural-language instructions at the start of the text.";

export function isSupportedStyleCombination(emotion: VoiceEmotion, expression: VoiceExpression): boolean {
  return !(emotion === "angry" && expression === "laughing");
}
