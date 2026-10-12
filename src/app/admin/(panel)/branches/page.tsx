import Link from "next/link";
import { BranchList } from "@/components/admin/BranchList";

export const metadata = { title: "Branches" };

export default function Page() {
  return (
    <>
      <div className="admin-top">
        <div><h1>Branches</h1><p className="muted" style={{ margin: 0 }}>Active branches appear on the website automatically. Deactivated branches keep their booking history.</p></div>
        <Link href="/admin/branches/new" className="btn">Add branch</Link>
      </div>
      <BranchList />
    </>
  );
}
