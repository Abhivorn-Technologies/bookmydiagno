import { route, ok, AppError, assertObjectId } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { serializeAppointment } from "@/lib/serialize";
import { User } from "@/models/User";
import { Appointment } from "@/models/Appointment";

export const dynamic = "force-dynamic";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  await requireAdmin();
  const { id } = await params;
  assertObjectId(id, "patient");
  await connectDB();
  const user = await User.findOne({ _id: id, role: "PATIENT" }).lean();
  if (!user) throw new AppError(404, "Patient not found.");
  const bookings = await Appointment.find({ $or: [{ patientId: user._id }, { patientId: null, patientPhoneSnapshot: user.phone }] })
    .sort({ appointmentDate: -1, timeSlot: -1 }).limit(200).lean();
  return ok({
    patient: { id: String(user._id), name: user.name, phone: user.phone, phoneVerified: !!user.phoneVerified, isActive: !!user.isActive, createdAt: user.createdAt },
    bookings: bookings.map((a) => serializeAppointment(a, { admin: true })),
  });
});
