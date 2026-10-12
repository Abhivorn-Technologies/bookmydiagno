import { route, ok, AppError, assertObjectId } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { serializeAppointment, serializePayment } from "@/lib/serialize";
import { canPatientCancel } from "@/lib/booking";
import { Appointment } from "@/models/Appointment";
import { Payment } from "@/models/Payment";

export const dynamic = "force-dynamic";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  assertObjectId(id, "booking");
  await connectDB();
  const filter: Record<string, unknown> = { _id: id };
  if (user.role !== "ADMIN") filter.patientId = user.id; // patients only ever see their own bookings
  const appointment = await Appointment.findOne(filter).lean();
  if (!appointment) throw new AppError(404, "Booking not found.");
  const payments = await Payment.find({ appointmentId: appointment._id }).sort({ createdAt: -1 }).lean();
  return ok({
    appointment: serializeAppointment(appointment, { admin: user.role === "ADMIN" }),
    payments: payments.map(serializePayment),
    cancellation: canPatientCancel(appointment),
  });
});
