import Link from "next/link";
import { loadPatientBooking } from "@/lib/page-data";
import { BookingReceipt } from "@/components/BookingReceipt";
import { PatientBookingActions } from "@/components/PatientBookingActions";
import { PaymentBadge } from "@/components/Badges";
import { formatDateTime, formatINR } from "@/lib/format";
import { label } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Booking details" };

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { appointment, payments, cancellation } = await loadPatientBooking(id, `/dashboard/bookings/${id}`);
  return (
    <div className="container section-tight" style={{ maxWidth: 760 }}>
      <p className="small no-print"><Link href="/dashboard">My bookings</Link> / {appointment.bookingReference}</p>
      <BookingReceipt appointment={appointment} />
      <div style={{ marginTop: 18 }}>
        <PatientBookingActions appointment={appointment} cancellation={cancellation} />
      </div>
      {payments.length > 0 && (
        <section className="no-print" style={{ marginTop: 28 }}>
          <h3>Payment attempts</h3>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>When</th><th>Reference</th><th>Method</th><th className="num">Amount</th><th>Status</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDateTime(p.createdAt)}</td>
                    <td className="small">{p.paymentReference}{p.type === "REFUND" ? " (refund)" : ""}</td>
                    <td>{label(p.paymentMode)}</td>
                    <td className="num">{formatINR(p.amount)}</td>
                    <td><PaymentBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
