import { route, ok, readJson, AppError, assertObjectId } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { adminBookingUpdateSchema } from "@/lib/validation";
import { cancelBooking, changeAppointmentStatus } from "@/lib/booking";
import { serializeAppointment, serializePayment } from "@/lib/serialize";
import { Appointment } from "@/models/Appointment";
import { Payment } from "@/models/Payment";

export const dynamic = "force-dynamic";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  await requireAdmin();
  const { id } = await params;
  assertObjectId(id, "booking");
  await connectDB();
  const appointment = await Appointment.findById(id).lean();
  if (!appointment) throw new AppError(404, "Booking not found.");
  const payments = await Payment.find({ appointmentId: appointment._id }).sort({ createdAt: -1 }).lean();
  return ok({ appointment: serializeAppointment(appointment, { admin: true }), payments: payments.map(serializePayment) });
});

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  assertObjectId(id, "booking");
  const body = adminBookingUpdateSchema.parse(await readJson(req));
  await connectDB();

  let updated;
  if (body.action === "status") {
    updated = await changeAppointmentStatus({ appointmentId: id, to: body.status, note: body.note, actorId: admin.id });
  } else if (body.action === "cancel") {
    updated = await cancelBooking({ appointmentId: id, reason: body.reason, actor: { id: admin.id, role: "ADMIN" } });
  } else {
    updated = await Appointment.findByIdAndUpdate(id, { $set: { notes: body.notes } }, { new: true }).lean();
    if (!updated) throw new AppError(404, "Booking not found.");
  }
  return ok({ appointment: serializeAppointment(updated, { admin: true }) });
});
