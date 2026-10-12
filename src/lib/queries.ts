import { connectDB } from "./mongodb";
import { serializeBranch, serializeTest } from "./serialize";
import { DiagnosticTest } from "@/models/DiagnosticTest";
import { Branch } from "@/models/Branch";
import type { BranchDTO, TestDTO } from "@/types";

// Read-only queries used by server-rendered public pages.

export async function getPopularTests(limit = 6): Promise<TestDTO[]> {
  await connectDB();
  let tests = await DiagnosticTest.find({ isActive: true, isPopular: true }).sort({ name: 1 }).limit(limit).lean();
  if (tests.length === 0) tests = await DiagnosticTest.find({ isActive: true }).sort({ createdAt: 1 }).limit(limit).lean();
  return tests.map(serializeTest);
}

export async function getActiveTest(id: string): Promise<TestDTO | null> {
  if (!/^[a-f\d]{24}$/i.test(id)) return null;
  await connectDB();
  const t = await DiagnosticTest.findOne({ _id: id, isActive: true }).lean();
  return t ? serializeTest(t) : null;
}

export async function getActiveBranches(): Promise<BranchDTO[]> {
  await connectDB();
  const branches = await Branch.find({ isActive: true }).sort({ city: 1, name: 1 }).lean();
  return branches.map((b) => serializeBranch(b));
}

export async function hasHomeCollection(): Promise<boolean> {
  await connectDB();
  return !!(await Branch.exists({ isActive: true, homeCollection: true }));
}
