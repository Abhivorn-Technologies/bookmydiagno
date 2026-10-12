import { randomInt } from "node:crypto";
import mongoose from "mongoose";
import { AppError } from "./api";
import { env } from "./env";
import { roundMoney } from "./format";
import {
  addDays,
  generateSlots,
  isSlotInPast,
  isValidDateString,
  istToDate,
  todayIST,
} from "./time";
import { APPOINTMENT_TRANSITIONS, type AppointmentStatus, type BookingPaymentMode, type CollectionMethod } from "./constants";
import { Branch, type BranchDoc } from "@/models/Branch";
import { DiagnosticTest } from "@/models/DiagnosticTest";
import { Appointment, type AppointmentDoc } from "@/models/Appointment";
import { Payment } from "@/models/Payment";
import { SlotSeat } from "@/models/SlotSeat";
import { User } from "@/models/User";
import type { SlotDTO } from "@/types";

const ACTIVE_STATUSES: AppointmentStatus[] = ["BOOKED", "CONFIRMED"];
const REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I to avoid confusion

export function generateBookingReference(now = new Date()): string {
  const d = todayIST(now).replace(/-/g, "").slice(2); // YYMMDD
  let suffix = "";
  for (let i = 0; i < 5; i++) suffix += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `BMD-${d}-${suffix}`;
}

const slotKeyOf = (branchId: string, date: string, slot: string) => `${branchId}|${date}|${slot}`;

/**
 * Takes one seat in a slot for the given appointment. Seats are numbered 0..capacity-1 and
 * protected by a unique index, so concurrent requests can never overfill a slot.
 */
export async function reserveSlot(branchId: string, date: string, slot: string, capacity: number, appointmentId: mongoose.Types.ObjectId) {
  const slotKey = slotKeyOf(branchId, date, slot);
  for (let seat = 0; seat < capacity; seat++) {
    try {
      await SlotSeat.create({ slotKey, seat, branchId: new mongoose.Types.ObjectId(branchId), date, slot, appointmentId });
      return;
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err; // seat taken, try the next one
    }
  }
  throw new AppError(409, "This time slot has just been fully booked. Please choose another slot.");
}

export async function releaseSlot(appointmentId: mongoose.Types.ObjectId | string) {
  await SlotSeat.deleteMany({ appointmentId });
}

export function bookingWindow(now = new Date()) {
  const from = todayIST(now);
  return { from, to: addDays(from, env.bookingWindowDays()) };
}

export async function getSlotAvailability(
  branch: Pick<BranchDoc, "_id" | "openingHours" | "slotDurationMinutes" | "slotCapacity">,
  date: string,
  opts: { now?: Date; allowPast?: boolean } = {}
): Promise<SlotDTO[]> {
  const now = opts.now ?? new Date();
  if (!isValidDateString(date)) throw new AppError(400, "Choose a valid date.");
  const window = bookingWindow(now);
  if (date < window.from || date > window.to) return [];
  const capacity = branch.slotCapacity ?? 4;
  const slots = generateSlots(
    { open: branch.openingHours.open, close: branch.openingHours.close, days: [...branch.openingHours.days] },
    date,
    branch.slotDurationMinutes ?? 30
  );
  const seats = await SlotSeat.find({ branchId: branch._id, date }).select("slot").lean();
  const used = new Map<string, number>();
  for (const s of seats) used.set(s.slot, (used.get(s.slot) ?? 0) + 1);
  return slots.map((time) => {
    const available = Math.max(0, capacity - (used.get(time) ?? 0));
    const past = opts.allowPast ? date < window.from : isSlotInPast(date, time, now);
    return { time, available, capacity, bookable: available > 0 && !past };
  });
}

type CreateBookingInput = {
  source: "ONLINE" | "OFFLINE";
  patientId: string | null;
  patientName: string;
  patientPhone: string;
  patientAge?: number | null;
  patientGender?: "MALE" | "FEMALE" | "OTHER" | null;
  branchId: string;
  testIds: string[];
  appointmentDate: string;
  timeSlot: string;
  paymentMode: BookingPaymentMode;
  collectionMethod: CollectionMethod;
  collectionAddress?: string;
  notes?: string;
  createdBy: string;
  /** Offline walk-ins may use a slot that has already started today. */
  allowPastSlot?: boolean;
  now?: Date;
};

/**
 * Creates a booking. Everything that matters is re-derived on the server:
 * branch status, test availability, current prices, slot validity and capacity.
 */
export async function createBooking(input: CreateBookingInput) {
  const now = input.now ?? new Date();

  const branch = await Branch.findById(input.branchId).lean();
  if (!branch || !branch.isActive) throw new AppError(400, "The selected branch is not available for booking.");

  const uniqueIds = [...new Set(input.testIds)];
  const tests = await DiagnosticTest.find({ _id: { $in: uniqueIds }, isActive: true }).lean();
  if (tests.length !== uniqueIds.length) {
    throw new AppError(400, "One or more selected tests are no longer available. Please review your selection.");
  }
  const ordered = uniqueIds.map((id) => tests.find((t) => String(t._id) === id)!);
  const totalAmount = roundMoney(ordered.reduce((sum, t) => sum + t.price, 0));

  if (input.collectionMethod === "HOME_COLLECTION" && !branch.homeCollection) {
    throw new AppError(400, "Home sample collection is not available from this branch.");
  }
  if (input.source === "ONLINE" && input.paymentMode === "PAY_AT_BRANCH" && !env.payAtBranchEnabled()) {
    throw new AppError(400, "Pay at branch is currently not available. Please pay online.");
  }

  const availability = await getSlotAvailability(branch, input.appointmentDate, {
    now,
    allowPast: input.source === "OFFLINE" && input.allowPastSlot,
  });
  const slot = availability.find((s) => s.time === input.timeSlot);
  if (!slot) throw new AppError(400, "The selected time slot is not offered by this branch on that date.");
  if (!slot.bookable) {
    throw new AppError(409, slot.available === 0 ? "This time slot is fully booked. Please choose another slot." : "This time slot is no longer available. Please choose a later slot.");
  }

  const branchId = String(branch._id);
  const appointmentId = new mongoose.Types.ObjectId();
  await reserveSlot(branchId, input.appointmentDate, input.timeSlot, branch.slotCapacity ?? 4, appointmentId);

  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const doc = await Appointment.create({
          _id: appointmentId,
          bookingReference: generateBookingReference(now),
          patientId: input.patientId ? new mongoose.Types.ObjectId(input.patientId) : null,
          patientNameSnapshot: input.patientName,
          patientPhoneSnapshot: input.patientPhone,
          patientAge: input.patientAge ?? null,
          patientGender: input.patientGender ?? null,
          branchId: branch._id,
          branchNameSnapshot: branch.name,
          branchCodeSnapshot: branch.branchCode,
          tests: ordered.map((t) => ({ testId: t._id, name: t.name, testCode: t.testCode, price: t.price })),
          appointmentDate: input.appointmentDate,
          timeSlot: input.timeSlot,
          collectionMethod: input.collectionMethod,
          collectionAddress: input.collectionMethod === "HOME_COLLECTION" ? input.collectionAddress ?? "" : "",
          bookingSource: input.source,
          appointmentStatus: "BOOKED",
          paymentMode: input.paymentMode,
          paymentStatus: "PENDING",
          totalAmount,
          notes: input.notes ?? "",
          createdBy: new mongoose.Types.ObjectId(input.createdBy),
          statusHistory: [{ from: null, to: "BOOKED", note: input.source === "OFFLINE" ? "Walk-in booking created by staff" : "Booked online", by: new mongoose.Types.ObjectId(input.createdBy), at: now }],
        });
        return doc.toObject() as AppointmentDoc;
      } catch (err) {
        const e = err as { code?: number; keyPattern?: Record<string, unknown> };
        if (e.code === 11000 && (!e.keyPattern || "bookingReference" in e.keyPattern)) continue; // reference collision, retry
        throw err;
      }
    }
    throw new AppError(500, "Could not generate a booking reference. Please try again.");
  } catch (err) {
    await releaseSlot(appointmentId).catch(() => undefined);
    throw err;
  }
}

/** For staff walk-ins: link to an existing patient account with the same phone, if any. */
export async function findPatientIdByPhone(phone: string): Promise<string | null> {
  const user = await User.findOne({ phone, role: "PATIENT" }).select("_id").lean();
  return user ? String(user._id) : null;
}

export function canPatientCancel(a: Pick<AppointmentDoc, "appointmentStatus" | "appointmentDate" | "timeSlot">, now = new Date()) {
  if (!ACTIVE_STATUSES.includes(a.appointmentStatus as AppointmentStatus)) {
    return { allowed: false, reason: "Only booked or confirmed appointments can be cancelled." };
  }
  const cutoffHours = env.cancellationCutoffHours();
  const msUntil = istToDate(a.appointmentDate, a.timeSlot).getTime() - now.getTime();
  if (msUntil < cutoffHours * 3_600_000) {
    return { allowed: false, reason: `Online cancellation closes ${cutoffHours} hour${cutoffHours === 1 ? "" : "s"} before the appointment. Please call the branch.` };
  }
  return { allowed: true, reason: "" };
}

export async function cancelBooking(opts: {
  appointmentId: string;
  reason: string;
  actor: { id: string; role: "PATIENT" | "ADMIN" };
  now?: Date;
}) {
  const now = opts.now ?? new Date();
  const filter: Record<string, unknown> = { _id: opts.appointmentId };
  if (opts.actor.role === "PATIENT") filter.patientId = opts.actor.id;

  const current = await Appointment.findOne(filter).lean();
  if (!current) throw new AppError(404, "Booking not found.");

  if (opts.actor.role === "PATIENT") {
    const check = canPatientCancel(current, now);
    if (!check.allowed) throw new AppError(400, check.reason);
  } else if (!APPOINTMENT_TRANSITIONS[current.appointmentStatus as AppointmentStatus].includes("CANCELLED")) {
    throw new AppError(400, `A ${current.appointmentStatus.toLowerCase().replace("_", " ")} booking cannot be cancelled.`);
  }

  // Money already received must be refunded; unpaid bookings simply stop being receivable.
  const nextPaymentStatus = current.paymentStatus === "PAID" ? "REFUND_PENDING" : current.paymentStatus;

  const updated = await Appointment.findOneAndUpdate(
    { ...filter, appointmentStatus: current.appointmentStatus, paymentStatus: current.paymentStatus },
    {
      $set: {
        appointmentStatus: "CANCELLED",
        paymentStatus: nextPaymentStatus,
        cancellationReason: opts.reason,
        cancelledBy: opts.actor.role,
        cancelledAt: now,
      },
      $push: { statusHistory: { from: current.appointmentStatus, to: "CANCELLED", note: opts.reason, by: opts.actor.id, at: now } },
    },
    { new: true }
  ).lean();
  if (!updated) throw new AppError(409, "This booking was updated by someone else. Please refresh and try again.");

  // Void any open payment attempts so they can never succeed after cancellation.
  await Payment.updateMany(
    { appointmentId: updated._id, status: "CREATED" },
    { $set: { status: "CANCELLED", failureReason: "Booking cancelled" } }
  );
  await releaseSlot(updated._id);
  return updated;
}

export async function changeAppointmentStatus(opts: {
  appointmentId: string;
  to: AppointmentStatus;
  note?: string;
  actorId: string;
  now?: Date;
}) {
  if (opts.to === "CANCELLED") throw new AppError(400, "Use the cancel action and provide a reason to cancel a booking.");
  const current = await Appointment.findById(opts.appointmentId).lean();
  if (!current) throw new AppError(404, "Booking not found.");
  const from = current.appointmentStatus as AppointmentStatus;
  if (from === opts.to) return current;
  if (!APPOINTMENT_TRANSITIONS[from].includes(opts.to)) {
    throw new AppError(400, `Status cannot change from ${from.replace("_", " ")} to ${opts.to.replace("_", " ")}.`);
  }
  const updated = await Appointment.findOneAndUpdate(
    { _id: current._id, appointmentStatus: from },
    {
      $set: { appointmentStatus: opts.to },
      $push: { statusHistory: { from, to: opts.to, note: opts.note ?? "", by: opts.actorId, at: opts.now ?? new Date() } },
    },
    { new: true }
  ).lean();
  if (!updated) throw new AppError(409, "This booking was updated by someone else. Please refresh and try again.");
  return updated;
}
