import mongoose, { Schema, type Model } from "mongoose";

/**
 * Idempotency guard. Inserting a key succeeds exactly once (unique index), so
 * operations like "capture the payment for booking X" cannot run twice even if
 * two requests arrive at the same moment.
 */
const onceLockSchema = new Schema({ key: { type: String, required: true }, note: { type: String, default: "" } }, { timestamps: true });
onceLockSchema.index({ key: 1 }, { unique: true });

type OnceLockDoc = { _id: mongoose.Types.ObjectId; key: string; note: string };

export const OnceLock: Model<OnceLockDoc> =
  (mongoose.models.OnceLock as Model<OnceLockDoc>) || mongoose.model<OnceLockDoc>("OnceLock", onceLockSchema);

/** Returns true if this caller won the key; false if it was already taken. */
export async function claimOnce(key: string, note = ""): Promise<boolean> {
  try {
    await OnceLock.create({ key, note });
    return true;
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return false;
    throw err;
  }
}

export async function releaseOnce(key: string) {
  await OnceLock.deleteOne({ key });
}
