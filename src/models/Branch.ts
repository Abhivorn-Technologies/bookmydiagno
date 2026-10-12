import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const openingHoursSchema = new Schema(
  {
    open: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ }, // "07:00"
    close: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ }, // "19:00"
    days: { type: [Number], default: [1, 2, 3, 4, 5, 6] }, // 0 = Sunday
  },
  { _id: false }
);

const branchSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    branchCode: { type: String, required: true, trim: true, uppercase: true, match: /^[A-Z0-9-]{2,20}$/ },
    address: { type: String, required: true, trim: true, maxlength: 400 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    pincode: { type: String, required: true, trim: true, match: /^[1-9]\d{5}$/ },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    // Entered by the admin from the real branch location. Optional so a branch can be
    // created first and geo-located later; branches without coordinates are excluded
    // from "nearby" sorting but still bookable and searchable.
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null },
    openingHours: { type: openingHoursSchema, required: true },
    services: { type: [String], default: [] },
    homeCollection: { type: Boolean, default: false },
    slotDurationMinutes: { type: Number, default: 30, min: 10, max: 240 },
    slotCapacity: { type: Number, default: 4, min: 1, max: 100 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

branchSchema.index({ branchCode: 1 }, { unique: true });
branchSchema.index({ isActive: 1, city: 1 });
branchSchema.index({ pincode: 1 });

export type BranchDoc = InferSchemaType<typeof branchSchema> & { _id: mongoose.Types.ObjectId };

export const Branch: Model<BranchDoc> =
  (mongoose.models.Branch as Model<BranchDoc>) || mongoose.model<BranchDoc>("Branch", branchSchema);
