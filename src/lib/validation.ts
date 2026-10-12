import { z } from "zod";
import {
  APPOINTMENT_STATUSES,
  BOOKING_PAYMENT_MODES,
  COLLECTION_METHODS,
  OFFLINE_PAYMENT_METHODS,
  PAYMENT_STATUSES,
  TEST_KINDS,
} from "./constants";

/** Accepts 10-digit Indian mobiles with optional +91 / 91 / 0 prefix, spaces or dashes. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s-()]/g, "").replace(/^\+?91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export const phoneSchema = z
  .string({ error: "Phone number is required." })
  .trim()
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit Indian mobile number." });
      return z.NEVER;
    }
    return n;
  });

const passwordSchema = z
  .string({ error: "Password is required." })
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Password must contain at least one letter and one number.");

const nameSchema = z
  .string({ error: "Name is required." })
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(80, "Name is too long.")
  .regex(/^[\p{L} .'-]+$/u, "Name can contain letters, spaces, dots, apostrophes and hyphens only.");

export const registerSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string({ error: "Please confirm your password." }),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string({ error: "Password is required." }).min(1, "Password is required.").max(200),
  portal: z.enum(["patient", "admin"]).default("patient"),
});

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id.");
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.");
const slotStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid time slot.");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM format.");

const patientDetails = {
  patientName: nameSchema.optional(),
  patientAge: z.coerce.number().int().min(0, "Invalid age.").max(120, "Invalid age.").optional().nullable(),
  patientGender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
};

export const createBookingSchema = z
  .object({
    branchId: objectId,
    testIds: z.array(objectId).min(1, "Select at least one test.").max(20, "Too many tests in one booking."),
    appointmentDate: dateStr,
    timeSlot: slotStr,
    paymentMode: z.enum(BOOKING_PAYMENT_MODES),
    collectionMethod: z.enum(COLLECTION_METHODS).default("BRANCH_VISIT"),
    collectionAddress: z.string().trim().max(400).optional().default(""),
    notes: z.string().trim().max(500).optional().default(""),
    ...patientDetails,
  })
  .refine((d) => d.collectionMethod !== "HOME_COLLECTION" || d.collectionAddress.length >= 10, {
    path: ["collectionAddress"],
    message: "Enter the full address for home sample collection.",
  });

export const adminCreateBookingSchema = z
  .object({
    patientId: objectId.optional().nullable(),
    patientName: nameSchema,
    patientPhone: phoneSchema,
    patientAge: patientDetails.patientAge,
    patientGender: patientDetails.patientGender,
    branchId: objectId,
    testIds: z.array(objectId).min(1, "Select at least one test.").max(20),
    appointmentDate: dateStr,
    timeSlot: slotStr,
    collectionMethod: z.enum(COLLECTION_METHODS).default("BRANCH_VISIT"),
    collectionAddress: z.string().trim().max(400).optional().default(""),
    notes: z.string().trim().max(500).optional().default(""),
    paymentStatus: z.enum(["PENDING", "PAID"]),
    paymentMethod: z.enum(OFFLINE_PAYMENT_METHODS).optional(),
    allowPastSlot: z.boolean().optional().default(false),
  })
  .refine((d) => d.paymentStatus !== "PAID" || !!d.paymentMethod, {
    path: ["paymentMethod"],
    message: "Select how the payment was received.",
  })
  .refine((d) => d.collectionMethod !== "HOME_COLLECTION" || d.collectionAddress.length >= 10, {
    path: ["collectionAddress"],
    message: "Enter the full address for home sample collection.",
  });

export const cancelSchema = z.object({
  reason: z.string().trim().min(3, "Please give a short reason.").max(300),
});

export const adminBookingUpdateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), status: z.enum(APPOINTMENT_STATUSES), note: z.string().trim().max(300).optional().default("") }),
  z.object({ action: z.literal("cancel"), reason: z.string().trim().min(3, "Please give a short reason.").max(300) }),
  z.object({ action: z.literal("notes"), notes: z.string().trim().max(500) }),
]);

export const recordPaymentSchema = z.object({
  type: z.enum(["CHARGE", "REFUND"]).default("CHARGE"),
  method: z.enum(OFFLINE_PAYMENT_METHODS),
  note: z.string().trim().max(300).optional().default(""),
});

export const simulatePaymentSchema = z.object({
  outcome: z.enum(["success", "failure", "cancel"]),
});

export const createPaymentSchema = z.object({ appointmentId: objectId });

const stringList = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => (Array.isArray(v) ? v : v.split(/[\n,]/)))
  .transform((arr) => arr.map((s) => s.trim()).filter(Boolean).slice(0, 40));

export const branchSchema = z
  .object({
    name: z.string().trim().min(2, "Branch name is required.").max(120),
    branchCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,20}$/, "Use 2–20 letters, digits or hyphens."),
    address: z.string().trim().min(5, "Full address is required.").max(400),
    city: z.string().trim().min(2, "City is required.").max(80),
    state: z.string().trim().min(2, "State is required.").max(80),
    pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code."),
    phone: z.string().trim().min(6, "Phone number is required.").max(20).regex(/^[+\d][\d\s-]{5,19}$/, "Enter a valid phone number."),
    latitude: z.union([z.null(), z.coerce.number().min(-90).max(90)]).optional().default(null),
    longitude: z.union([z.null(), z.coerce.number().min(-180).max(180)]).optional().default(null),
    openingHours: z.object({
      open: hhmm,
      close: hhmm,
      days: z.array(z.number().int().min(0).max(6)).min(1, "Select at least one working day."),
    }),
    services: stringList.default([]),
    homeCollection: z.boolean().default(false),
    slotDurationMinutes: z.coerce.number().int().min(10).max(240).default(30),
    slotCapacity: z.coerce.number().int().min(1).max(100).default(4),
    isActive: z.boolean().default(true),
  })
  .refine((b) => b.openingHours.open < b.openingHours.close, { path: ["openingHours.close"], message: "Closing time must be after opening time." })
  .refine((b) => (b.latitude === null) === (b.longitude === null), { path: ["longitude"], message: "Enter both latitude and longitude, or neither." });

export const branchPatchSchema = z.union([
  z.object({ isActive: z.boolean() }).strict(),
  branchSchema,
]);

export const testSchema = z.object({
  name: z.string().trim().min(2, "Test name is required.").max(160),
  testCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,30}$/, "Use 2–30 letters, digits or hyphens."),
  kind: z.enum(TEST_KINDS).default("TEST"),
  category: z.string().trim().min(2, "Category is required.").max(80),
  description: z.string().trim().max(2000).default(""),
  preparationInstructions: z.string().trim().max(1000).default(""),
  includes: stringList.default([]),
  reportTime: z.string().trim().max(60).default(""),
  price: z.coerce.number().min(0, "Price cannot be negative.").max(1_000_000),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const testPatchSchema = z.union([z.object({ isActive: z.boolean() }).strict(), testSchema]);

export const bookingFilterSchema = z.object({
  q: z.string().trim().max(80).optional(),
  date: dateStr.optional(),
  from: dateStr.optional(),
  to: dateStr.optional(),
  branchId: objectId.optional(),
  patientId: objectId.optional(),
  appointmentStatus: z.enum(APPOINTMENT_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  bookingSource: z.enum(["ONLINE", "OFFLINE"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Turns URLSearchParams into an object, dropping empty values. */
export function searchParamsToObject(sp: URLSearchParams) {
  const out: Record<string, string> = {};
  sp.forEach((v, k) => {
    if (v !== "") out[k] = v;
  });
  return out;
}
