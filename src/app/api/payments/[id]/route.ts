import { route, ok, assertObjectId } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { getPaymentForUser } from "@/lib/payments";
import { serializePayment } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  assertObjectId(id, "payment");
  await connectDB();
  const payment = await getPaymentForUser(id, user);
  return ok({ payment: serializePayment(payment) });
});
