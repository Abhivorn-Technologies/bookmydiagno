import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { serializeAppointment } from "@/lib/serialize";
import { Appointment } from "@/models/Appointment";
import { PatientDashboard } from "@/components/PatientDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "My bookings" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role === "ADMIN") redirect("/admin");
  await connectDB();
  const bookings = await Appointment.find({ patientId: user.id }).sort({ appointmentDate: -1, timeSlot: -1 }).limit(200).lean();
  return (
    <div className="container section-tight">
      <PatientDashboard user={user} bookings={bookings.map((b) => serializeAppointment(b))} />
    </div>
  );
}
