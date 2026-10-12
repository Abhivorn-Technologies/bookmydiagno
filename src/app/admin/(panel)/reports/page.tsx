import { Reports } from "@/components/admin/Reports";

export const metadata = { title: "Reports" };

export default function Page() {
  return (
    <>
      <div className="admin-top"><div><h1>Reports</h1><p className="muted" style={{ margin: 0 }}>Bookings and collections by appointment date.</p></div></div>
      <Reports />
    </>
  );
}
