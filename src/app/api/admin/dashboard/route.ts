import { route, ok } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { getDashboardStats } from "@/lib/stats";
import { serializeAppointment } from "@/lib/serialize";
import { todayIST } from "@/lib/time";
import { Appointment } from "@/models/Appointment";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin();
  await connectDB();
  const today = todayIST();
  const [stats, todaySchedule, recent] = await Promise.all([
    getDashboardStats(),
    Appointment.find({ appointmentDate: today, appointmentStatus: { $ne: "CANCELLED" } }).sort({ timeSlot: 1 }).limit(50).lean(),
    Appointment.find({}).sort({ createdAt: -1 }).limit(8).lean(),
  ]);
  return ok({
    stats,
    today,
    todaySchedule: todaySchedule.map((a) => serializeAppointment(a, { admin: true })),
    recent: recent.map((a) => serializeAppointment(a, { admin: true })),
  });
});
