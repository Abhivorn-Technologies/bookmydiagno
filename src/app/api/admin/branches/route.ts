import { route, ok, readJson, AppError } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { branchSchema } from "@/lib/validation";
import { serializeBranch } from "@/lib/serialize";
import { Branch } from "@/models/Branch";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin();
  await connectDB();
  const branches = await Branch.find({}).sort({ isActive: -1, city: 1, name: 1 }).lean();
  return ok({ branches: branches.map((b) => serializeBranch(b, { admin: true })) });
});

export const POST = route(async (req) => {
  await requireAdmin();
  const body = branchSchema.parse(await readJson(req));
  await connectDB();
  if (await Branch.exists({ branchCode: body.branchCode })) {
    throw new AppError(409, "A branch with this code already exists.", { branchCode: "Branch code must be unique." });
  }
  const branch = await Branch.create(body);
  return ok({ branch: serializeBranch(branch.toObject(), { admin: true }) }, 201);
});
