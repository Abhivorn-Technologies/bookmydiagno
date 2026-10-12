import { route, ok, readJson, AppError, assertObjectId } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { branchPatchSchema } from "@/lib/validation";
import { serializeBranch } from "@/lib/serialize";
import { Branch } from "@/models/Branch";
import { Appointment } from "@/models/Appointment";

export const dynamic = "force-dynamic";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  await requireAdmin();
  const { id } = await params;
  assertObjectId(id, "branch");
  await connectDB();
  const branch = await Branch.findById(id).lean();
  if (!branch) throw new AppError(404, "Branch not found.");
  const bookingCount = await Appointment.countDocuments({ branchId: branch._id });
  return ok({ branch: serializeBranch(branch, { admin: true }), bookingCount });
});

/** Branches are never deleted: deactivating hides them publicly but keeps their booking history. */
export const PATCH = route<{ id: string }>(async (req, { params }) => {
  await requireAdmin();
  const { id } = await params;
  assertObjectId(id, "branch");
  const body = branchPatchSchema.parse(await readJson(req));
  await connectDB();
  if ("branchCode" in body && (await Branch.exists({ branchCode: body.branchCode, _id: { $ne: id } }))) {
    throw new AppError(409, "A branch with this code already exists.", { branchCode: "Branch code must be unique." });
  }
  const branch = await Branch.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true }).lean();
  if (!branch) throw new AppError(404, "Branch not found.");
  return ok({ branch: serializeBranch(branch, { admin: true }) });
});
