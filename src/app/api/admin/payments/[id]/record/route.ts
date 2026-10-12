import { route, ok, readJson, assertObjectId } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { recordPaymentSchema } from "@/lib/validation";
import { recordOfflinePayment } from "@/lib/payments";
import { serializeAppointment, serializePayment } from "@/lib/serialize";

/**
 * Records money actually received at the counter (CHARGE) or returned to the patient (REFUND).
 * `[id]` is the booking (appointment) id. The amount is always computed on the server.
 */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  assertObjectId(id, "booking");
  const body = recordPaymentSchema.parse(await readJson(req));
  await connectDB();
  const res = await recordOfflinePayment({ appointmentId: id, type: body.type, method: body.method, note: body.note, adminId: admin.id });
  return ok({ appointment: serializeAppointment(res.appointment, { admin: true }), payment: serializePayment(res.payment) }, 201);
});
