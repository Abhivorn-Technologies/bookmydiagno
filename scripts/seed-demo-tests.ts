/**
 * OPTIONAL: adds a starter catalogue of common tests so the site can be demonstrated.
 * Prices are PLACEHOLDERS — the clinic must review and edit them in Admin → Tests
 * before going live. Existing test codes are never overwritten.
 * Branches are intentionally NOT seeded: real addresses/coordinates must be entered by the admin.
 *
 *   npm run seed:demo-tests
 */
import "./load-env";
import mongoose from "mongoose";
import { DiagnosticTest } from "../src/models/DiagnosticTest";

const FASTING = "10–12 hours overnight fasting. Plain water is allowed.";

const TESTS = [
  { testCode: "CBC", name: "Complete Blood Count (CBC)", category: "Blood tests", price: 300, isPopular: true, reportTime: "same day", description: "Measures red cells, white cells, haemoglobin and platelets to screen for anaemia, infection and other conditions.", preparationInstructions: "" },
  { testCode: "FBS", name: "Fasting Blood Sugar", category: "Diabetes", price: 100, isPopular: true, reportTime: "same day", description: "Measures blood glucose after fasting to screen for and monitor diabetes.", preparationInstructions: "8–10 hours fasting. Plain water is allowed." },
  { testCode: "HBA1C", name: "HbA1c (Glycated Haemoglobin)", category: "Diabetes", price: 450, isPopular: true, reportTime: "24 hours", description: "Shows your average blood sugar over the last 2–3 months.", preparationInstructions: "" },
  { testCode: "LIPID", name: "Lipid Profile", category: "Heart health", price: 600, isPopular: true, reportTime: "24 hours", description: "Total cholesterol, HDL, LDL, VLDL and triglycerides to assess heart risk.", preparationInstructions: FASTING },
  { testCode: "TFT", name: "Thyroid Profile (T3, T4, TSH)", category: "Thyroid", price: 550, isPopular: true, reportTime: "24 hours", description: "Checks how well your thyroid gland is working.", preparationInstructions: "Early-morning sample preferred. Take thyroid medicine after the sample unless your doctor says otherwise." },
  { testCode: "LFT", name: "Liver Function Test (LFT)", category: "Organ function", price: 700, reportTime: "24 hours", description: "Bilirubin, liver enzymes and proteins to check liver health.", preparationInstructions: "8 hours fasting recommended." },
  { testCode: "KFT", name: "Kidney Function Test (KFT)", category: "Organ function", price: 650, reportTime: "24 hours", description: "Urea, creatinine, uric acid and electrolytes to check kidney health.", preparationInstructions: "" },
  { testCode: "VITD", name: "Vitamin D (25-OH)", category: "Vitamins", price: 1200, isPopular: true, reportTime: "24–48 hours", description: "Measures vitamin D level in the blood.", preparationInstructions: "" },
  { testCode: "VITB12", name: "Vitamin B12", category: "Vitamins", price: 900, reportTime: "24–48 hours", description: "Measures vitamin B12 to check for deficiency.", preparationInstructions: "" },
  { testCode: "URINE-RE", name: "Urine Routine Examination", category: "Urine tests", price: 150, reportTime: "same day", description: "Physical, chemical and microscopic examination of urine.", preparationInstructions: "First morning midstream sample preferred. Use the sterile container given at the branch." },
  { testCode: "PKG-BASIC", name: "Basic Health Checkup", kind: "PACKAGE", category: "Health packages", price: 1499, isPopular: true, reportTime: "24–48 hours", description: "A yearly checkup covering blood count, sugar, cholesterol, liver, kidney and thyroid.", preparationInstructions: FASTING, includes: ["Complete Blood Count", "Fasting Blood Sugar", "Lipid Profile", "Liver Function Test", "Kidney Function Test", "Thyroid Profile", "Urine Routine"] },
  { testCode: "PKG-DIAB", name: "Diabetes Care Package", kind: "PACKAGE", category: "Health packages", price: 999, reportTime: "24 hours", description: "Tests to monitor diabetes and its effect on the kidneys.", preparationInstructions: FASTING, includes: ["Fasting Blood Sugar", "HbA1c", "Kidney Function Test", "Urine Routine"] },
];

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set.");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15_000 });
  await DiagnosticTest.syncIndexes();
  let created = 0;
  for (const t of TESTS) {
    const res = await DiagnosticTest.updateOne({ testCode: t.testCode }, { $setOnInsert: { kind: "TEST", includes: [], isActive: true, ...t } }, { upsert: true });
    if (res.upsertedCount) created++;
  }
  console.log(`✔ Demo catalogue: ${created} tests added, ${TESTS.length - created} already existed.`);
  console.log("  Review the PLACEHOLDER prices in Admin → Tests before going live.");
}

main()
  .catch((err) => { console.error("✖", err instanceof Error ? err.message : err); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
