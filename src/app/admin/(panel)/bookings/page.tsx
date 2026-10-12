import Link from "next/link";
import { Suspense } from "react";
import { BookingsList } from "@/components/admin/BookingsList";

export const metadata = { title: "Bookings" };

export default function AdminBookingsPage() {
  return (
    <>
      <div className="admin-top">
        <div><h1>Bookings</h1><p className="muted" style={{ margin: 0 }}>Online and walk-in bookings from every branch.</p></div>
        <Link href="/admin/bookings/new" className="btn">New walk-in booking</Link>
      </div>
      <Suspense><BookingsList /></Suspense>
    </>
  );
}
