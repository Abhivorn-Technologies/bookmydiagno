import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * One document per occupied seat in a branch time slot.
 * The unique (slotKey, seat) index means two concurrent bookings can never take the
 * same seat, and seats are only numbered 0..capacity-1, so a slot can never be overfilled.
 * This holds even without multi-document transactions.
 */
const slotSeatSchema = new Schema(
  {
    slotKey: { type: String, required: true }, // `${branchId}|${date}|${slot}`
    seat: { type: Number, required: true, min: 0 },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    date: { type: String, required: true },
    slot: { type: String, required: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
  },
  { timestamps: true }
);

slotSeatSchema.index({ slotKey: 1, seat: 1 }, { unique: true });
slotSeatSchema.index({ appointmentId: 1 });
slotSeatSchema.index({ branchId: 1, date: 1 });

export type SlotSeatDoc = InferSchemaType<typeof slotSeatSchema> & { _id: mongoose.Types.ObjectId };

export const SlotSeat: Model<SlotSeatDoc> =
  (mongoose.models.SlotSeat as Model<SlotSeatDoc>) || mongoose.model<SlotSeatDoc>("SlotSeat", slotSeatSchema);
