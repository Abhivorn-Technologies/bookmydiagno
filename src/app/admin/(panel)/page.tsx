import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { getDashboardStats } from "@/lib/stats";
import { serializeAppointment } from "@/lib/serialize";
import { formatINR } from "@/lib/format";
import { formatDateLabel, formatSlot, todayIST } from "@/lib/time";
import { label } from "@/lib/constants";
import { Appointment } from "@/models/Appointment";
import { AppointmentBadge, PaymentBadge } from "@/components/Badges";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  await connectDB();
  const today = todayIST();
  const [s, todayRaw] = await Promise.all([
    getDashboardStats(),
    Appointment.find({ appointmentDate: today, appointmentStatus: { $ne: "CANCELLED" } }).sort({ timeSlot: 1 }).limit(50).lean(),
  ]);
  const schedule = todayRaw.map((a) => serializeAppointment(a, { admin: true }));

  const cards: { k: string; v: string | number; note?: string; cls?: string; href?: string }[] = [
    { k: "Total bookings", v: s.totalBookings, href: "/admin/bookings" },
    { k: "Today’s appointments", v: s.todaysBookings, href: `/admin/bookings?date=${today}` },
    { k: "Upcoming", v: s.upcomingBookings, note: "Booked or confirmed" },
    { k: "Completed", v: s.completedBookings, href: "/admin/bookings?appointmentStatus=COMPLETED" },
    { k: "Cancelled", v: s.cancelledBookings, href: "/admin/bookings?appointmentStatus=CANCELLED" },
    { k: "Total booking value", v: formatINR(s.totalBookingValue), note: "All bookings except cancelled", cls: "stat-money" },
    { k: "Payments collected", v: formatINR(s.paymentsCollected), note: `Net of ${formatINR(s.refundsPaid)} refunded`, cls: "stat-good", href: "/admin/payments" },
    { k: "Pending payments", v: formatINR(s.pendingPayments), note: "Due, not yet received", cls: "stat-warn", href: "/admin/bookings?paymentStatus=PENDING" },
    { k: "Refunds due", v: formatINR(s.refundsDue), note: "Paid, then cancelled", cls: s.refundsDue > 0 ? "stat-warn" : "", href: "/admin/bookings?paymentStatus=REFUND_PENDING" },
    { k: "Online bookings", v: s.onlineBookings, href: "/admin/bookings?bookingSource=ONLINE" },
    { k: "Offline bookings", v: s.offlineBookings, href: "/admin/bookings?bookingSource=OFFLINE" },
    { k: "Active branches", v: s.activeBranches, href: "/admin/branches" },
  ];

  return (
    <>
      <div className="admin-top">
        <div>
          <h1>Dashboard</h1>
          <p className="muted" style={{ margin: 0 }}>{formatDateLabel(today)} · {s.registeredPatients} registered patients</p>
        </div>
        <Link href="/admin/bookings/new" className="btn">New walk-in booking</Link>
      </div>
      <div className="stat-grid">
        {cards.map((c) => {
          const body = (
            <>
              <div className="k">{c.k}</div>
              <div className="v">{c.v}</div>
              {c.note && <div className="note">{c.note}</div>}
            </>
          );
          return c.href ? (
            <Link key={c.k} href={c.href} className={`stat ${c.cls ?? ""}`} style={{ textDecoration: "none", color: "inherit" }}>{body}</Link>
          ) : (
            <div key={c.k} className={`stat ${c.cls ?? ""}`}>{body}</div>
          );
        })}
      </div>

      <section style={{ marginTop: 32 }}>
        <div className="spread" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: "1.3rem", margin: 0 }}>Today’s schedule</h2>
          <Link href={`/admin/bookings?date=${today}`}>Manage today’s bookings</Link>
        </div>
        {schedule.length === 0 ? (
          <div className="empty">No appointments today yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Time</th><th>Patient</th><th>Branch</th><th>Tests</th><th>Status</th><th>Payment</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {schedule.map((a) => (
                  <tr key={a.id}>
                    <td><Link href={`/admin/bookings/${a.id}`}><strong>{formatSlot(a.timeSlot)}</strong></Link></td>
                    <td>{a.patientName}<div className="small muted">{a.patientPhone}</div></td>
                    <td>{a.branchName}</td>
                    <td className="small">{a.tests.map((t) => t.name).join(", ")}</td>
                    <td><AppointmentBadge status={a.appointmentStatus} /></td>
                    <td><PaymentBadge status={a.paymentStatus} /><div className="small muted">{label(a.paymentMode)}</div></td>
                    <td className="num">{formatINR(a.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="small muted" style={{ marginTop: 24, maxWidth: "80ch" }}>
        How totals are calculated: <strong>booking value</strong> is the sum of all bookings that aren’t cancelled. <strong>Payments collected</strong> counts only money actually received (successful demo online payments and payments recorded at the counter), minus refunds paid. <strong>Pending payments</strong> is money still due and is not counted as revenue.
      </p>
    </>
  );
}
