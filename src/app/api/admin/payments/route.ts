import { route, ok, escapeRegex } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { serializePayment } from "@/lib/serialize";
import { PAYMENT_RECORD_STATUSES } from "@/lib/constants";
import { Payment } from "@/models/Payment";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin();
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim().slice(0, 80);
  const status = sp.get("status");
  const type = sp.get("type");
  const provider = sp.get("provider");
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 25));
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (q) filter.$or = [{ bookingReference: new RegExp(escapeRegex(q), "i") }, { paymentReference: new RegExp(escapeRegex(q), "i") }];
  if (status && (PAYMENT_RECORD_STATUSES as readonly string[]).includes(status)) filter.status = status;
  if (type === "CHARGE" || type === "REFUND") filter.type = type;
  if (provider === "DUMMY" || provider === "OFFLINE") filter.provider = provider;
  const [payments, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Payment.countDocuments(filter),
  ]);
  return ok({ payments: payments.map(serializePayment), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});
