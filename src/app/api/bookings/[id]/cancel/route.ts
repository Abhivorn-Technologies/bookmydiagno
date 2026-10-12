import { route, ok, readJson, assertObjectId } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requirePatient } from "@/lib/auth";
import { cancelSchema } from "@/lib/validation";
import { cancelBooking } from "@/lib/booking";
import { serializeAppointment } from "@/lib/serialize";

export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requirePatient();
  const { id } = await params;
  assertObjectId(id, "booking");
  const body = cancelSchema.parse(await readJson(req));
  await connectDB();
  const updated = await cancelBooking({ appointmentId: id, reason: body.reason, actor: { id: user.id, role: "PATIENT" } });
  return ok({ appointment: serializeAppointment(updated) });
});
