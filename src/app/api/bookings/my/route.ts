import { route, ok } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requirePatient } from "@/lib/auth";
import { serializeAppointment } from "@/lib/serialize";
import { Appointment } from "@/models/Appointment";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requirePatient();
  await connectDB();
  const items = await Appointment.find({ patientId: user.id }).sort({ appointmentDate: -1, timeSlot: -1 }).limit(200).lean();
  return ok({ bookings: items.map((a) => serializeAppointment(a)) });
});
