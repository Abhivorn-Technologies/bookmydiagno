import { route, ok, AppError, assertObjectId } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { serializeBranch } from "@/lib/serialize";
import { Branch } from "@/models/Branch";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  assertObjectId(id, "branch");
  await connectDB();
  const branch = await Branch.findOne({ _id: id, isActive: true }).lean();
  if (!branch) throw new AppError(404, "Branch not found.");
  return ok({ branch: serializeBranch(branch) });
});
