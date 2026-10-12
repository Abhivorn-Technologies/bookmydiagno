import { route, ok, escapeRegex } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { normalizePhone } from "@/lib/validation";
import { User } from "@/models/User";
import { Appointment } from "@/models/Appointment";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin();
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim().slice(0, 80);
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 20));
  await connectDB();

  const filter: Record<string, unknown> = { role: "PATIENT" };
  if (q) {
    const phone = normalizePhone(q);
    filter.$or = [{ name: new RegExp(escapeRegex(q), "i") }, { phone: phone ?? new RegExp(escapeRegex(q.replace(/\D/g, "") || q)) }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), // passwordHash is select:false
    User.countDocuments(filter),
  ]);
  const counts = await Appointment.aggregate([
    { $match: { patientId: { $in: users.map((u) => u._id) } } },
    { $group: { _id: "$patientId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count as number]));
  return ok({
    patients: users.map((u) => ({
      id: String(u._id),
      name: u.name,
      phone: u.phone,
      phoneVerified: !!u.phoneVerified,
      isActive: !!u.isActive,
      createdAt: u.createdAt,
      bookingCount: countMap.get(String(u._id)) ?? 0,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});
