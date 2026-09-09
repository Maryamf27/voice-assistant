import { Schema, model, models, type Model, type Types } from "mongoose";

export type GenerationType = "tts" | "text_to_speech" | "voice_clone" | "voice_design";
export type GenerationStatus = "pending" | "processing" | "completed" | "failed";
export interface IGeneration { userId: Types.ObjectId; type: GenerationType; input: string; voiceId?: Types.ObjectId; voiceName?: string; model?: string; status: GenerationStatus; audioUrl?: string; createdAt: Date; updatedAt: Date }
const generationSchema = new Schema<IGeneration>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["tts", "text_to_speech", "voice_clone", "voice_design"], required: true },
  input: { type: String, required: true, maxlength: 10000 },
  voiceId: { type: Schema.Types.ObjectId, ref: "Voice" }, voiceName: { type: String, trim: true }, model: { type: String, trim: true }, audioUrl: { type: String, trim: true },
  status: { type: String, enum: ["pending", "processing", "completed", "failed"], required: true, default: "pending" },
}, { timestamps: true });
export const Generation: Model<IGeneration> = models.Generation || model<IGeneration>("Generation", generationSchema);
