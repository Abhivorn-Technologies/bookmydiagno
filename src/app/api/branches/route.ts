import { route, ok, escapeRegex } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { serializeBranch } from "@/lib/serialize";
import { Branch } from "@/models/Branch";

export const dynamic = "force-dynamic";

/** Active branches, optionally filtered by PIN code, city or branch name. */
export const GET = route(async (req) => {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 80);
  await connectDB();
  const filter: Record<string, unknown> = { isActive: true };
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { city: rx }, { pincode: rx }, { address: rx }, { branchCode: rx }];
  }
  const branches = await Branch.find(filter).sort({ city: 1, name: 1 }).lean();
  return ok({ branches: branches.map((b) => serializeBranch(b)) });
});
