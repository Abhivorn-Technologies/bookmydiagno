import { route, ok, readJson, assertObjectId } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requirePatient } from "@/lib/auth";
import { simulatePaymentSchema } from "@/lib/validation";
import { simulatePayment } from "@/lib/payments";
import { serializePayment } from "@/lib/serialize";

export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requirePatient();
  const { id } = await params;
  assertObjectId(id, "payment");
  const { outcome } = simulatePaymentSchema.parse(await readJson(req));
  await connectDB();
  const result = await simulatePayment(id, outcome, user);
  return ok({ payment: serializePayment(result.payment), paymentStatus: result.appointmentPaymentStatus });
});
