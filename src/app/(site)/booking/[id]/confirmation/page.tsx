import Link from "next/link";
import { loadPatientBooking } from "@/lib/page-data";
import { BookingReceipt } from "@/components/BookingReceipt";
import { PatientBookingActions } from "@/components/PatientBookingActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Booking confirmed" };

export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { appointment: a, cancellation } = await loadPatientBooking(id, `/booking/${id}/confirmation`);
  const prep = a.appointmentStatus !== "CANCELLED";
  return (
    <div className="container section" style={{ maxWidth: 720 }}>
      <div className="no-print">
        {a.paymentStatus === "PAID" ? (
          <div className="alert alert-ok" role="status"><strong>You’re booked and paid.</strong> Show your booking reference at the branch.</div>
        ) : a.paymentMode === "PAY_AT_BRANCH" ? (
          <div className="alert alert-ok" role="status"><strong>You’re booked.</strong> Please pay at the branch when you arrive.</div>
        ) : a.paymentStatus === "FAILED" ? (
          <div className="alert alert-warn" role="status"><strong>Your booking is saved, but payment didn’t go through.</strong> Try again below or pay at the branch.</div>
        ) : (
          <div className="alert alert-info" role="status"><strong>Your booking is saved.</strong> Payment is still pending.</div>
        )}
        <h1 style={{ fontSize: "2rem" }}>Booking {a.bookingReference}</h1>
      </div>
      <BookingReceipt appointment={a} />
      {prep && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>Before you come in</h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Arrive 10 minutes before your slot and carry a photo ID.</li>
            <li>Follow the preparation shown for each test — for example, fasting where required.</li>
            <li>Mention your booking reference at the counter.</li>
          </ul>
        </div>
      )}
      <div className="spread" style={{ marginTop: 20 }}>
        <PatientBookingActions appointment={a} cancellation={cancellation} />
        <Link href="/dashboard" className="btn btn-ghost no-print">All my bookings</Link>
      </div>
    </div>
  );
}
