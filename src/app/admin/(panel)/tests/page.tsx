import Link from "next/link";
import { TestList } from "@/components/admin/TestList";

export const metadata = { title: "Tests & packages" };

export default function Page() {
  return (
    <>
      <div className="admin-top">
        <div><h1>Tests &amp; packages</h1><p className="muted" style={{ margin: 0 }}>Only active tests are shown to patients.</p></div>
        <Link href="/admin/tests/new" className="btn">Add test</Link>
      </div>
      <TestList />
    </>
  );
}
