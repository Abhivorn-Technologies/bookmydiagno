import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  APPOINTMENT_STATUSES,
  BOOKING_PAYMENT_MODES,
  BOOKING_SOURCES,
  COLLECTION_METHODS,
  PAYMENT_STATUSES,
} from "@/lib/constants";

const bookedTestSchema = new Schema(
  {
    testId: { type: Schema.Types.ObjectId, ref: "DiagnosticTest", required: true },
    name: { type: String, required: true },
    testCode: { type: String, required: true },
    // Price snapshot taken at booking time; later price changes never affect this booking
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const statusEventSchema = new Schema(
  {
    from: { type: String },
    to: { type: String, required: true },
    note: { type: String, default: "" },
    by: { type: Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const appointmentSchema = new Schema(
  {
    bookingReference: { type: String, required: true },
    // Null for walk-in patients who do not have an account
    patientId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    patientNameSnapshot: { type: String, required: true, trim: true },
    patientPhoneSnapshot: { type: String, required: true, trim: true },
    patientAge: { type: Number, min: 0, max: 120, default: null },
    patientGender: { type: String, enum: ["MALE", "FEMALE", "OTHER"], default: null },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    branchNameSnapshot: { type: String, required: true },
    branchCodeSnapshot: { type: String, required: true },
    tests: { type: [bookedTestSchema], validate: (v: unknown[]) => Array.isArray(v) && v.length > 0 },
    appointmentDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // IST calendar date
    timeSlot: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ }, // IST start time
    collectionMethod: { type: String, enum: COLLECTION_METHODS, default: "BRANCH_VISIT" },
    collectionAddress: { type: String, default: "", maxlength: 400 },
    bookingSource: { type: String, enum: BOOKING_SOURCES, required: true },
    appointmentStatus: { type: String, enum: APPOINTMENT_STATUSES, default: "BOOKED" },
    paymentMode: { type: String, enum: BOOKING_PAYMENT_MODES, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "PENDING" },
    totalAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    amountRefunded: { type: Number, default: 0, min: 0 },
    cancellationReason: { type: String, default: "" },
    cancelledBy: { type: String, enum: ["PATIENT", "ADMIN"], default: null },
    cancelledAt: { type: Date, default: null },
    notes: { type: String, default: "", maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    statusHistory: { type: [statusEventSchema], default: [] },
  },
  { timestamps: true }
);

appointmentSchema.index({ bookingReference: 1 }, { unique: true });
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ branchId: 1, appointmentDate: 1, timeSlot: 1 });
appointmentSchema.index({ appointmentDate: 1, appointmentStatus: 1 });
appointmentSchema.index({ patientPhoneSnapshot: 1 });

export type AppointmentDoc = InferSchemaType<typeof appointmentSchema> & { _id: mongoose.Types.ObjectId };

export const Appointment: Model<AppointmentDoc> =
  (mongoose.models.Appointment as Model<AppointmentDoc>) ||
  mongoose.model<AppointmentDoc>("Appointment", appointmentSchema);
