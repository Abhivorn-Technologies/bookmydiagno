import { route, ok, readJson, AppError, assertObjectId } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { testPatchSchema } from "@/lib/validation";
import { serializeTest } from "@/lib/serialize";
import { DiagnosticTest } from "@/models/DiagnosticTest";

export const dynamic = "force-dynamic";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  await requireAdmin();
  const { id } = await params;
  assertObjectId(id, "test");
  await connectDB();
  const test = await DiagnosticTest.findById(id).lean();
  if (!test) throw new AppError(404, "Test not found.");
  return ok({ test: serializeTest(test) });
});

/** Price changes only affect new bookings — existing appointments keep their price snapshots. */
export const PATCH = route<{ id: string }>(async (req, { params }) => {
  await requireAdmin();
  const { id } = await params;
  assertObjectId(id, "test");
  const body = testPatchSchema.parse(await readJson(req));
  await connectDB();
  if ("testCode" in body && (await DiagnosticTest.exists({ testCode: body.testCode, _id: { $ne: id } }))) {
    throw new AppError(409, "A test with this code already exists.", { testCode: "Test code must be unique." });
  }
  const test = await DiagnosticTest.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true }).lean();
  if (!test) throw new AppError(404, "Test not found.");
  return ok({ test: serializeTest(test) });
});
