import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { serializeTest } from "@/lib/serialize";
import { DiagnosticTest } from "@/models/DiagnosticTest";
import { TestForm } from "@/components/admin/TestForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit test" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  await connectDB();
  const [t, categories] = await Promise.all([DiagnosticTest.findById(id).lean(), DiagnosticTest.distinct("category")]);
  if (!t) notFound();
  const test = serializeTest(t);
  return (
    <>
      <div className="admin-top">
        <div><p className="small" style={{ margin: 0 }}><Link href="/admin/tests">Tests</Link> / {test.testCode}</p><h1>{test.name}</h1></div>
      </div>
      <TestForm test={test} categories={(categories as string[]).sort()} />
    </>
  );
}
