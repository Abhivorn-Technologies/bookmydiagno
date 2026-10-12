import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { serializeAppointment } from "@/lib/serialize";
import { formatDateTime, formatINR } from "@/lib/format";
import { formatDateLabel, formatSlot } from "@/lib/time";
import { label } from "@/lib/constants";
import { User } from "@/models/User";
import { Appointment } from "@/models/Appointment";
import { AppointmentBadge, PaymentBadge } from "@/components/Badges";

export const dynamic = "force-dynamic";
export const metadata = { title: "Patient" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  await connectDB();
  const u = await User.findOne({ _id: id, role: "PATIENT" }).lean();
  if (!u) notFound();
  const raw = await Appointment.find({ $or: [{ patientId: u._id }, { patientId: null, patientPhoneSnapshot: u.phone }] }).sort({ appointmentDate: -1, timeSlot: -1 }).limit(200).lean();
  const bookings = raw.map((a) => serializeAppointment(a, { admin: true }));
  const spent = bookings.reduce((s, b) => s + b.amountPaid - b.amountRefunded, 0);
  return (
    <>
      <div className="admin-top">
        <div>
          <p className="small" style={{ margin: 0 }}><Link href="/admin/patients">Patients</Link></p>
          <h1>{u.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            <a href={`tel:${u.phone}`}>{u.phone}</a> {u.phoneVerified ? "" : "(not verified)"} · Registered {formatDateTime(u.createdAt as unknown as string)} · {bookings.length} bookings · {formatINR(spent)} paid
          </p>
        </div>
        <Link href="/admin/bookings/new" className="btn">New walk-in booking</Link>
      </div>
      {bookings.length === 0 ? (
        <div className="empty">No bookings yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Reference</th><th>Appointment</th><th>Branch</th><th>Tests</th><th>Status</th><th>Payment</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {bookings.map((a) => (
                <tr key={a.id}>
                  <td><Link href={`/admin/bookings/${a.id}`}><strong>{a.bookingReference}</strong></Link><div className="small muted">{label(a.bookingSource)}</div></td>
                  <td>{formatDateLabel(a.appointmentDate)}<div className="small muted">{formatSlot(a.timeSlot)}</div></td>
                  <td>{a.branchName}</td>
                  <td className="small">{a.tests.map((t) => t.name).join(", ")}</td>
                  <td><AppointmentBadge status={a.appointmentStatus} /></td>
                  <td><PaymentBadge status={a.paymentStatus} /></td>
                  <td className="num">{formatINR(a.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
