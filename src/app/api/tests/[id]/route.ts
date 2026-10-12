import { route, ok, AppError, assertObjectId } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { serializeTest } from "@/lib/serialize";
import { DiagnosticTest } from "@/models/DiagnosticTest";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  assertObjectId(id, "test");
  await connectDB();
  const test = await DiagnosticTest.findOne({ _id: id, isActive: true }).lean();
  if (!test) throw new AppError(404, "Test not found.");
  return ok({ test: serializeTest(test) });
});
