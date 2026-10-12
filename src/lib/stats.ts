import mongoose from "mongoose";
import { Appointment } from "@/models/Appointment";
import { Payment } from "@/models/Payment";
import { Branch } from "@/models/Branch";
import { User } from "@/models/User";
import { roundMoney } from "./format";
import { todayIST } from "./time";
import { escapeRegex } from "./api";
import { normalizePhone } from "./validation";
import type { DashboardStats } from "@/types";

async function sumField(model: mongoose.Model<any>, match: Record<string, unknown>, field: string): Promise<number> {
  const [row] = await model.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: `$${field}` } } }]);
  return roundMoney(row?.total ?? 0);
}

/**
 * Revenue definitions used across the admin panel:
 *  - Booking value     = sum of totalAmount for all bookings that are not cancelled.
 *  - Gross collected   = successful payments (demo online + recorded offline collections).
 *  - Refunds paid      = recorded refunds.
 *  - Payments collected (net) = gross collected − refunds paid.
 *  - Pending payments  = amount still due on non-cancelled bookings (NOT revenue).
 *  - Refunds due       = money received on cancelled bookings that hasn't been refunded yet.
 */
export async function getDashboardStats(scope: { from?: string; to?: string; branchId?: string } = {}): Promise<DashboardStats> {
  const today = todayIST();
  const base: Record<string, unknown> = {};
  if (scope.branchId) base.branchId = new mongoose.Types.ObjectId(scope.branchId);
  if (scope.from || scope.to) base.appointmentDate = { ...(scope.from ? { $gte: scope.from } : {}), ...(scope.to ? { $lte: scope.to } : {}) };

  const notCancelled: Record<string, unknown> = { ...base, appointmentStatus: { $ne: "CANCELLED" } };
  const unpaid: Record<string, unknown> = { ...notCancelled, paymentStatus: { $in: ["PENDING", "FAILED"] } };

  // Payments are scoped by the bookings they belong to when a filter is applied.
  let paymentScope: Record<string, unknown> = {};
  if (Object.keys(base).length) {
    const ids = await Appointment.find(base).distinct("_id");
    paymentScope = { appointmentId: { $in: ids } };
  }

  const [
    totalBookings, todaysBookings, upcomingBookings, completedBookings, cancelledBookings,
    onlineBookings, offlineBookings, totalBookingValue, pendingTotal, pendingPaidPart,
    grossCollected, refundsPaid, refundDueReceived, refundDueReturned, activeBranches, registeredPatients,
  ] = await Promise.all([
    Appointment.countDocuments(base),
    Appointment.countDocuments({ ...notCancelled, appointmentDate: today }),
    Appointment.countDocuments({ ...base, appointmentDate: { $gte: today, ...(base.appointmentDate as object ?? {}) }, appointmentStatus: { $in: ["BOOKED", "CONFIRMED"] } }),
    Appointment.countDocuments({ ...base, appointmentStatus: "COMPLETED" }),
    Appointment.countDocuments({ ...base, appointmentStatus: "CANCELLED" }),
    Appointment.countDocuments({ ...base, bookingSource: "ONLINE" }),
    Appointment.countDocuments({ ...base, bookingSource: "OFFLINE" }),
    sumField(Appointment, notCancelled, "totalAmount"),
    sumField(Appointment, unpaid, "totalAmount"),
    sumField(Appointment, unpaid, "amountPaid"),
    sumField(Payment, { ...paymentScope, type: "CHARGE", status: "SUCCESS" }, "amount"),
    sumField(Payment, { ...paymentScope, type: "REFUND", status: "SUCCESS" }, "amount"),
    sumField(Appointment, { ...base, paymentStatus: "REFUND_PENDING" }, "amountPaid"),
    sumField(Appointment, { ...base, paymentStatus: "REFUND_PENDING" }, "amountRefunded"),
    Branch.countDocuments({ isActive: true }),
    User.countDocuments({ role: "PATIENT" }),
  ]);

  return {
    totalBookings,
    todaysBookings,
    upcomingBookings,
    completedBookings,
    cancelledBookings,
    totalBookingValue,
    grossCollected,
    refundsPaid,
    paymentsCollected: roundMoney(grossCollected - refundsPaid),
    pendingPayments: roundMoney(pendingTotal - pendingPaidPart),
    refundsDue: roundMoney(refundDueReceived - refundDueReturned),
    onlineBookings,
    offlineBookings,
    activeBranches,
    registeredPatients,
  };
}

export type BookingFilters = {
  q?: string;
  date?: string;
  from?: string;
  to?: string;
  branchId?: string;
  patientId?: string;
  appointmentStatus?: string;
  paymentStatus?: string;
  bookingSource?: string;
};

export function buildBookingQuery(f: BookingFilters) {
  const query: Record<string, unknown> = {};
  if (f.date) query.appointmentDate = f.date;
  else if (f.from || f.to) query.appointmentDate = { ...(f.from ? { $gte: f.from } : {}), ...(f.to ? { $lte: f.to } : {}) };
  if (f.branchId) query.branchId = new mongoose.Types.ObjectId(f.branchId);
  if (f.patientId) query.patientId = new mongoose.Types.ObjectId(f.patientId);
  if (f.appointmentStatus) query.appointmentStatus = f.appointmentStatus;
  if (f.paymentStatus) query.paymentStatus = f.paymentStatus;
  if (f.bookingSource) query.bookingSource = f.bookingSource;
  if (f.q) {
    const phone = normalizePhone(f.q);
    const rx = new RegExp(escapeRegex(f.q), "i");
    query.$or = [
      { bookingReference: rx },
      { patientNameSnapshot: rx },
      { patientPhoneSnapshot: phone ? phone : rx },
    ];
  }
  return query;
}
