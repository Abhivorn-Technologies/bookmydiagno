import { route, ok, escapeRegex } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { serializeTest } from "@/lib/serialize";
import { DiagnosticTest } from "@/models/DiagnosticTest";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim().slice(0, 80);
  const category = sp.get("category")?.trim();
  const kind = sp.get("kind");
  const popular = sp.get("popular") === "1";

  await connectDB();
  const filter: Record<string, unknown> = { isActive: true };
  if (q) filter.$or = [{ name: new RegExp(escapeRegex(q), "i") }, { testCode: new RegExp(escapeRegex(q), "i") }, { category: new RegExp(escapeRegex(q), "i") }];
  if (category) filter.category = category;
  if (kind === "TEST" || kind === "PACKAGE") filter.kind = kind;
  if (popular) filter.isPopular = true;

  const [tests, categories] = await Promise.all([
    DiagnosticTest.find(filter).sort({ isPopular: -1, name: 1 }).limit(200).lean(),
    DiagnosticTest.find({ isActive: true }).distinct("category"),
  ]);
  return ok({ tests: tests.map(serializeTest), categories: (categories as string[]).sort() });
});
