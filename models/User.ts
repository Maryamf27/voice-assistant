import { Schema, model, models, type Model, type Document } from "mongoose";

export interface IUser extends Document { name: string; email: string; passwordHash: string; createdAt: Date; updatedAt: Date }
const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
}, { timestamps: true });
export const User: Model<IUser> = models.User || model<IUser>("User", userSchema);
