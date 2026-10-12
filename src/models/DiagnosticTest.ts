import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { TEST_KINDS } from "@/lib/constants";

const diagnosticTestSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    testCode: { type: String, required: true, trim: true, uppercase: true, match: /^[A-Z0-9-]{2,30}$/ },
    kind: { type: String, enum: TEST_KINDS, default: "TEST" },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    preparationInstructions: { type: String, default: "", trim: true, maxlength: 1000 },
    // For packages: names of the tests included
    includes: { type: [String], default: [] },
    reportTime: { type: String, default: "", trim: true, maxlength: 60 },
    price: { type: Number, required: true, min: 0, max: 1_000_000 },
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

diagnosticTestSchema.index({ testCode: 1 }, { unique: true });
diagnosticTestSchema.index({ isActive: 1, category: 1 });
diagnosticTestSchema.index({ name: 1 });

export type DiagnosticTestDoc = InferSchemaType<typeof diagnosticTestSchema> & { _id: mongoose.Types.ObjectId };

export const DiagnosticTest: Model<DiagnosticTestDoc> =
  (mongoose.models.DiagnosticTest as Model<DiagnosticTestDoc>) ||
  mongoose.model<DiagnosticTestDoc>("DiagnosticTest", diagnosticTestSchema);
