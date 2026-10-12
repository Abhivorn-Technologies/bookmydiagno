import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { ROLES } from "@/lib/constants";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    // Stored as a normalised 10-digit Indian mobile number
    phone: { type: String, required: true, trim: true, match: /^[6-9]\d{9}$/ },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "PATIENT", required: true },
    // No OTP provider is configured in this version, so this stays false.
    phoneVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ role: 1, name: 1 });

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>("User", userSchema);
