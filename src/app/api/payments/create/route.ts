import { route, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requirePatient } from "@/lib/auth";
import { createPaymentSchema } from "@/lib/validation";
import { createPaymentAttempt } from "@/lib/payments";
import { serializePayment } from "@/lib/serialize";

export const POST = route(async (req) => {
  const user = await requirePatient();
  const body = createPaymentSchema.parse(await readJson(req));
  await connectDB();
  const payment = await createPaymentAttempt(body.appointmentId, user);
  return ok({ payment: serializePayment(payment), demo: true }, 201);
});
