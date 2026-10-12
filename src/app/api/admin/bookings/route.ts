import { route, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { adminCreateBookingSchema, bookingFilterSchema, searchParamsToObject } from "@/lib/validation";
import { buildBookingQuery } from "@/lib/stats";
import { createBooking, findPatientIdByPhone } from "@/lib/booking";
import { recordOfflinePayment } from "@/lib/payments";
import { serializeAppointment } from "@/lib/serialize";
import { Appointment } from "@/models/Appointment";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin();
  const f = bookingFilterSchema.parse(searchParamsToObject(new URL(req.url).searchParams));
  await connectDB();
  const query = buildBookingQuery(f);
  const [items, total] = await Promise.all([
    Appointment.find(query).sort({ appointmentDate: -1, timeSlot: -1, createdAt: -1 }).skip((f.page - 1) * f.limit).limit(f.limit).lean(),
    Appointment.countDocuments(query),
  ]);
  return ok({ bookings: items.map((a) => serializeAppointment(a, { admin: true })), total, page: f.page, pages: Math.max(1, Math.ceil(total / f.limit)) });
});

/** Offline / walk-in booking created by staff. Uses the same collection and status system as online bookings. */
export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const body = adminCreateBookingSchema.parse(await readJson(req));
  await connectDB();

  let patientId: string | null = null;
  if (body.patientId) {
    const exists = await User.exists({ _id: body.patientId, role: "PATIENT" });
    patientId = exists ? body.patientId : null;
  }
  patientId ??= await findPatientIdByPhone(body.patientPhone);

  const appointment = await createBooking({
    source: "OFFLINE",
    patientId,
    patientName: body.patientName,
    patientPhone: body.patientPhone,
    patientAge: body.patientAge ?? null,
    patientGender: body.patientGender ?? null,
    branchId: body.branchId,
    testIds: body.testIds,
    appointmentDate: body.appointmentDate,
    timeSlot: body.timeSlot,
    paymentMode: "PAY_AT_BRANCH",
    collectionMethod: body.collectionMethod,
    collectionAddress: body.collectionAddress,
    notes: body.notes,
    createdBy: admin.id,
    allowPastSlot: body.allowPastSlot,
  });

  let final = appointment;
  let paymentError: string | null = null;
  if (body.paymentStatus === "PAID" && body.paymentMethod) {
    try {
      const res = await recordOfflinePayment({ appointmentId: String(appointment._id), type: "CHARGE", method: body.paymentMethod, adminId: admin.id });
      final = res.appointment;
    } catch (err) {
      paymentError = err instanceof Error ? err.message : "Payment could not be recorded.";
    }
  }
  return ok({ appointment: serializeAppointment(final, { admin: true }), paymentError }, 201);
});
