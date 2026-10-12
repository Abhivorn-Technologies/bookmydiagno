import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { PAYMENT_METHODS, PAYMENT_PROVIDERS, PAYMENT_RECORD_STATUSES, PAYMENT_TYPES } from "@/lib/constants";

const paymentSchema = new Schema(
  {
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
    bookingReference: { type: String, required: true },
    provider: { type: String, enum: PAYMENT_PROVIDERS, required: true },
    type: { type: String, enum: PAYMENT_TYPES, default: "CHARGE" },
    // Server-generated attempt reference (e.g. "pay_DEMO_...")
    paymentReference: { type: String, required: true },
    // Simulated gateway transaction id, set only after a verified successful simulation
    gatewayPaymentId: { type: String, default: null },
    paymentMode: { type: String, enum: PAYMENT_METHODS, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: PAYMENT_RECORD_STATUSES, default: "CREATED" },
    failureReason: { type: String, default: "" },
    note: { type: String, default: "", maxlength: 300 },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdByUser: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ paymentReference: 1 }, { unique: true });
paymentSchema.index({ appointmentId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, type: 1 });

export type PaymentDoc = InferSchemaType<typeof paymentSchema> & { _id: mongoose.Types.ObjectId };

export const Payment: Model<PaymentDoc> =
  (mongoose.models.Payment as Model<PaymentDoc>) || mongoose.model<PaymentDoc>("Payment", paymentSchema);
