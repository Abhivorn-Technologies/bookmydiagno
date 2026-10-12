import { connectDB } from "@/lib/mongodb";
import { DiagnosticTest } from "@/models/DiagnosticTest";
import { TestForm } from "@/components/admin/TestForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add test" };

export default async function Page() {
  await connectDB();
  const categories = ((await DiagnosticTest.distinct("category")) as string[]).sort();
  return (
    <>
      <div className="admin-top"><h1>Add test or package</h1></div>
      <TestForm categories={categories} />
    </>
  );
}
