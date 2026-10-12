import { route, ok, readJson, escapeRegex, AppError } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { testSchema } from "@/lib/validation";
import { serializeTest } from "@/lib/serialize";
import { DiagnosticTest } from "@/models/DiagnosticTest";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin();
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim().slice(0, 80);
  const status = sp.get("status");
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (q) filter.$or = [{ name: new RegExp(escapeRegex(q), "i") }, { testCode: new RegExp(escapeRegex(q), "i") }, { category: new RegExp(escapeRegex(q), "i") }];
  if (status === "active") filter.isActive = true;
  if (status === "inactive") filter.isActive = false;
  const [tests, categories] = await Promise.all([
    DiagnosticTest.find(filter).sort({ name: 1 }).lean(),
    DiagnosticTest.distinct("category"),
  ]);
  return ok({ tests: tests.map(serializeTest), categories: (categories as string[]).sort() });
});

export const POST = route(async (req) => {
  await requireAdmin();
  const body = testSchema.parse(await readJson(req));
  await connectDB();
  if (await DiagnosticTest.exists({ testCode: body.testCode })) {
    throw new AppError(409, "A test with this code already exists.", { testCode: "Test code must be unique." });
  }
  const test = await DiagnosticTest.create(body);
  return ok({ test: serializeTest(test.toObject()) }, 201);
});
