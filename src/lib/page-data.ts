import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { connectDB } from "./mongodb";
import { serializeAppointment, serializePayment } from "./serialize";
import { canPatientCancel } from "./booking";
import { Appointment } from "@/models/Appointment";
import { Payment } from "@/models/Payment";

/** Loads a booking for the logged-in patient (404 for anyone else's booking). */
export async function loadPatientBooking(id: string, nextPath: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (user.role !== "PATIENT") redirect("/admin");
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  await connectDB();
  const appt = await Appointment.findOne({ _id: id, patientId: user.id }).lean();
  if (!appt) notFound();
  const payments = await Payment.find({ appointmentId: appt._id }).sort({ createdAt: -1 }).lean();
  return {
    user,
    appointment: serializeAppointment(appt),
    payments: payments.map(serializePayment),
    cancellation: canPatientCancel(appt),
  };
}
