import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { serializeBranch } from "@/lib/serialize";
import { Branch } from "@/models/Branch";
import { Appointment } from "@/models/Appointment";
import { BranchForm } from "@/components/admin/BranchForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Branch" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  await connectDB();
  const b = await Branch.findById(id).lean();
  if (!b) notFound();
  const bookingCount = await Appointment.countDocuments({ branchId: b._id });
  const branch = serializeBranch(b, { admin: true });
  return (
    <>
      <div className="admin-top">
        <div>
          <p className="small" style={{ margin: 0 }}><Link href="/admin/branches">Branches</Link> / {branch.branchCode}</p>
          <h1>{branch.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            <span className={`badge ${branch.isActive ? "badge-ok" : ""}`}>{branch.isActive ? "Active" : "Inactive"}</span>{" "}
            <Link href={`/admin/bookings?branchId=${branch.id}`}>{bookingCount} bookings</Link>
          </p>
        </div>
      </div>
      <BranchForm branch={branch} />
    </>
  );
}
