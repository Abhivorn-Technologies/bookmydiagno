import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import mongoose from "mongoose";
import { AppError } from "./api";
import { env } from "./env";
import { roundMoney } from "./format";
import { Appointment } from "@/models/Appointment";
import { Payment, type PaymentDoc } from "@/models/Payment";
import { claimOnce, releaseOnce } from "@/models/OnceLock";

// A booking can have at most one successful charge and one refund, ever.
const chargeKey = (appointmentId: unknown) => `charge:${String(appointmentId)}`;
const refundKey = (appointmentId: unknown) => `refund:${String(appointmentId)}`;
import type { SessionUser } from "./auth";

/**
 * DEMO PAYMENT MODULE
 * -------------------
 * This mimics a Razorpay-style flow without contacting any real gateway:
 *   1. Server creates a payment attempt with its own reference and the server-computed amount.
 *   2. The demo checkout asks the server to "simulate" success / failure / cancel.
 *   3. For success, a mock gateway inside the server issues a gateway payment id and an
 *      HMAC signature, and the server verifies that signature before marking anything paid.
 * No card details are collected and no money moves. To go live, replace `mockGatewayCapture`
 * with real Razorpay order creation + webhook/signature verification.
 */

/** Demo (simulated) references are marked DEMO; staff-recorded counter payments are real and are not. */
const newRef = (prefix: string, demo = true) => `${prefix}_${demo ? "DEMO_" : ""}${randomBytes(9).toString("base64url")}`;

function sign(paymentReference: string, gatewayPaymentId: string) {
  return createHmac("sha256", env.authSecret()).update(`${paymentReference}|${gatewayPaymentId}`).digest("hex");
}

export function verifyGatewaySignature(paymentReference: string, gatewayPaymentId: string, signature: string) {
  const expected = Buffer.from(sign(paymentReference, gatewayPaymentId), "hex");
  const given = Buffer.from(signature, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function mockGatewayCapture(paymentReference: string) {
  const gatewayPaymentId = newRef("gpay");
  return { gatewayPaymentId, signature: sign(paymentReference, gatewayPaymentId) };
}

async function loadOwnedAppointment(appointmentId: string, user: SessionUser) {
  const appt = await Appointment.findById(appointmentId).lean();
  if (!appt) throw new AppError(404, "Booking not found.");
  if (user.role !== "ADMIN" && String(appt.patientId) !== user.id) throw new AppError(404, "Booking not found.");
  return appt;
}

export async function createPaymentAttempt(appointmentId: string, user: SessionUser): Promise<PaymentDoc> {
  const appt = await loadOwnedAppointment(appointmentId, user);
  if (appt.paymentMode !== "ONLINE") throw new AppError(400, "This booking is set to pay at the branch.");
  if (["CANCELLED", "NO_SHOW"].includes(appt.appointmentStatus)) throw new AppError(400, "This booking is no longer active.");
  if (!["PENDING", "FAILED"].includes(appt.paymentStatus)) throw new AppError(409, "This booking has already been paid.");

  // Only one open attempt at a time.
  await Payment.updateMany(
    { appointmentId: appt._id, status: "CREATED" },
    { $set: { status: "CANCELLED", failureReason: "Superseded by a new attempt" } }
  );

  const payment = await Payment.create({
    appointmentId: appt._id,
    bookingReference: appt.bookingReference,
    provider: "DUMMY",
    type: "CHARGE",
    paymentReference: newRef("pay"),
    paymentMode: "DUMMY_ONLINE",
    amount: roundMoney(appt.totalAmount - (appt.amountPaid ?? 0)),
    status: "CREATED",
    createdByUser: new mongoose.Types.ObjectId(user.id),
  });
  return payment.toObject() as PaymentDoc;
}

export async function getPaymentForUser(paymentId: string, user: SessionUser) {
  const payment = await Payment.findById(paymentId).lean();
  if (!payment) throw new AppError(404, "Payment not found.");
  await loadOwnedAppointment(String(payment.appointmentId), user); // ownership check
  return payment;
}

export async function simulatePayment(paymentId: string, outcome: "success" | "failure" | "cancel", user: SessionUser) {
  const payment = await getPaymentForUser(paymentId, user);
  if (payment.provider !== "DUMMY") throw new AppError(400, "Only demo payments can be simulated.");
  if (payment.status === "SUCCESS") throw new AppError(409, "This payment has already been completed.");
  if (payment.status !== "CREATED") throw new AppError(409, "This payment attempt is closed. Please start a new payment.");

  const appt = await Appointment.findById(payment.appointmentId).lean();
  if (!appt || ["CANCELLED", "NO_SHOW"].includes(appt.appointmentStatus)) {
    await Payment.updateOne({ _id: payment._id, status: "CREATED" }, { $set: { status: "CANCELLED", failureReason: "Booking no longer active" } });
    throw new AppError(400, "This booking is no longer active.");
  }

  if (outcome === "cancel") {
    const res = await Payment.findOneAndUpdate(
      { _id: payment._id, status: "CREATED" },
      { $set: { status: "CANCELLED", failureReason: "Checkout cancelled by patient" } },
      { new: true }
    ).lean();
    if (!res) throw new AppError(409, "This payment attempt is already closed.");
    return { payment: res, appointmentPaymentStatus: appt.paymentStatus };
  }

  if (outcome === "failure") {
    const res = await Payment.findOneAndUpdate(
      { _id: payment._id, status: "CREATED" },
      { $set: { status: "FAILED", failureReason: "Demo bank declined the payment (simulated)" } },
      { new: true }
    ).lean();
    if (!res) throw new AppError(409, "This payment attempt is already closed.");
    await Appointment.updateOne({ _id: appt._id, paymentStatus: "PENDING" }, { $set: { paymentStatus: "FAILED" } });
    return { payment: res, appointmentPaymentStatus: "FAILED" };
  }

  // success — the mock gateway responds, and the server verifies before trusting it
  const { gatewayPaymentId, signature } = mockGatewayCapture(payment.paymentReference);
  if (!verifyGatewaySignature(payment.paymentReference, gatewayPaymentId, signature)) {
    throw new AppError(400, "Payment verification failed.");
  }
  // Idempotency: only one request can ever capture a charge for this booking,
  // so double-clicks, retries or a simultaneous counter payment can't double-charge.
  if (!(await claimOnce(chargeKey(appt._id), `dummy:${payment.paymentReference}`))) {
    throw new AppError(409, "This booking has already been paid.");
  }
  const captured = await Payment.findOneAndUpdate(
    { _id: payment._id, status: "CREATED" },
    { $set: { status: "SUCCESS", gatewayPaymentId } },
    { new: true }
  ).lean();
  if (!captured) {
    await releaseOnce(chargeKey(appt._id));
    throw new AppError(409, "This payment attempt is already closed.");
  }

  const paid = await Appointment.findOneAndUpdate(
    { _id: appt._id, paymentStatus: { $in: ["PENDING", "FAILED"] }, appointmentStatus: { $nin: ["CANCELLED", "NO_SHOW"] } },
    { $set: { paymentStatus: "PAID" }, $inc: { amountPaid: captured.amount } },
    { new: true }
  ).lean();
  if (!paid) {
    // Booking changed underneath us (e.g. cancelled). Money was "taken", so flag it for refund.
    await Appointment.updateOne({ _id: appt._id }, { $set: { paymentStatus: "REFUND_PENDING" }, $inc: { amountPaid: captured.amount } });
    return { payment: captured, appointmentPaymentStatus: "REFUND_PENDING" };
  }
  return { payment: captured, appointmentPaymentStatus: paid.paymentStatus };
}

/** Staff record that money was actually received at the counter, or refunded. */
export async function recordOfflinePayment(opts: {
  appointmentId: string;
  type: "CHARGE" | "REFUND";
  method: "CASH" | "UPI" | "CARD" | "OTHER";
  note?: string;
  adminId: string;
}) {
  const appt = await Appointment.findById(opts.appointmentId).lean();
  if (!appt) throw new AppError(404, "Booking not found.");
  const adminObjectId = new mongoose.Types.ObjectId(opts.adminId);

  if (opts.type === "CHARGE") {
    if (appt.appointmentStatus === "CANCELLED") throw new AppError(400, "Cannot collect payment for a cancelled booking.");
    if (!["PENDING", "FAILED"].includes(appt.paymentStatus)) throw new AppError(409, "This booking has no amount due.");
    const amount = roundMoney(appt.totalAmount - (appt.amountPaid ?? 0));
    if (!(await claimOnce(chargeKey(appt._id), `offline:${opts.adminId}`))) {
      throw new AppError(409, "This booking has already been paid.");
    }

    const updated = await Appointment.findOneAndUpdate(
      { _id: appt._id, paymentStatus: { $in: ["PENDING", "FAILED"] }, appointmentStatus: { $ne: "CANCELLED" } },
      { $set: { paymentStatus: "PAID" }, $inc: { amountPaid: amount } },
      { new: true }
    ).lean();
    if (!updated) {
      await releaseOnce(chargeKey(appt._id));
      throw new AppError(409, "Payment status changed. Please refresh and try again.");
    }

    try {
      const payment = await Payment.create({
        appointmentId: appt._id,
        bookingReference: appt.bookingReference,
        provider: "OFFLINE",
        type: "CHARGE",
        paymentReference: newRef("cntr", false),
        paymentMode: opts.method,
        amount,
        status: "SUCCESS",
        note: opts.note ?? "",
        recordedBy: adminObjectId,
      });
      // An online checkout left open must not succeed after cash was taken.
      await Payment.updateMany(
        { appointmentId: appt._id, status: "CREATED" },
        { $set: { status: "CANCELLED", failureReason: "Paid at branch" } }
      );
      return { appointment: updated, payment: payment.toObject() as PaymentDoc };
    } catch (err) {
      // Roll back the appointment change so states stay consistent.
      await Appointment.updateOne({ _id: appt._id, paymentStatus: "PAID" }, { $set: { paymentStatus: appt.paymentStatus }, $inc: { amountPaid: -amount } });
      await releaseOnce(chargeKey(appt._id));
      throw err;
    }
  }

  // REFUND
  if (appt.paymentStatus !== "REFUND_PENDING") throw new AppError(409, "There is no refund due on this booking.");
  const amount = roundMoney((appt.amountPaid ?? 0) - (appt.amountRefunded ?? 0));
  if (!(await claimOnce(refundKey(appt._id), `offline:${opts.adminId}`))) {
    throw new AppError(409, "A refund has already been recorded for this booking.");
  }
  const updated = await Appointment.findOneAndUpdate(
    { _id: appt._id, paymentStatus: "REFUND_PENDING" },
    { $set: { paymentStatus: "REFUNDED" }, $inc: { amountRefunded: amount } },
    { new: true }
  ).lean();
  if (!updated) {
    await releaseOnce(refundKey(appt._id));
    throw new AppError(409, "Refund status changed. Please refresh and try again.");
  }
  try {
    const payment = await Payment.create({
      appointmentId: appt._id,
      bookingReference: appt.bookingReference,
      provider: "OFFLINE",
      type: "REFUND",
      paymentReference: newRef("rfnd", false),
      paymentMode: opts.method,
      amount,
      status: "SUCCESS",
      note: opts.note ?? "",
      recordedBy: adminObjectId,
    });
    return { appointment: updated, payment: payment.toObject() as PaymentDoc };
  } catch (err) {
    await Appointment.updateOne({ _id: appt._id, paymentStatus: "REFUNDED" }, { $set: { paymentStatus: "REFUND_PENDING" }, $inc: { amountRefunded: -amount } });
    await releaseOnce(refundKey(appt._id));
    throw err;
  }
}
