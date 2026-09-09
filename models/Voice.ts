import { Schema, model, models, type Document, type Model, type Types } from "mongoose";

export type VoiceType = "personal" | "designed" | "library";
export interface IVoice extends Document { userId: Types.ObjectId; name: string; type: VoiceType; audioUrl?: string; fishReferenceId?: string; createdAt: Date; updatedAt: Date }
const voiceSchema = new Schema<IVoice>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  type: { type: String, enum: ["personal", "designed", "library"], required: true },
  audioUrl: { type: String, trim: true },
  fishReferenceId: { type: String, trim: true },
}, { timestamps: true });
export const Voice: Model<IVoice> = models.Voice || model<IVoice>("Voice", voiceSchema);
