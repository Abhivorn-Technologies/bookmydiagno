import { Slip } from "./Slip";
import { AppointmentBadge, PaymentBadge } from "./Badges";
import { formatINR, formatDateTime } from "@/lib/format";
import { formatDateLabel, formatSlot } from "@/lib/time";
import { label } from "@/lib/constants";
import type { AppointmentDTO } from "@/types";

/** Printable confirmation / receipt. Used by patients and admins. */
export function BookingReceipt({ appointment: a }: { appointment: AppointmentDTO }) {
  return (
    <div>
      <div className="print-only" style={{ marginBottom: 12 }}>
        <strong style={{ fontSize: 18 }}>BookMyDiagno</strong> — Booking receipt
      </div>
      <Slip
        title={a.appointmentStatus === "CANCELLED" ? "Booking cancelled" : "Booking confirmation"}
        status={<span style={{ background: "#fff", borderRadius: 999 }}><AppointmentBadge status={a.appointmentStatus} /></span>}
        reference={a.bookingReference}
        footnote={`Booked ${formatDateTime(a.createdAt)} · ${label(a.bookingSource)}`}
        rows={[
          { k: "Patient", v: <>{a.patientName}{a.patientAge !== null ? `, ${a.patientAge} yrs` : ""}<br /><span className="small muted" style={{ fontWeight: 400 }}>{a.patientPhone}</span></> },
          { k: "Branch", v: a.branchName },
          { k: "Date & time", v: `${formatDateLabel(a.appointmentDate)}, ${formatSlot(a.timeSlot)}` },
          { k: "Collection", v: a.collectionMethod === "HOME_COLLECTION" ? `Home — ${a.collectionAddress}` : "At the branch" },
          ...a.tests.map((t) => ({ k: t.name, v: <span className="money">{formatINR(t.price)}</span> })),
          { k: "Total", v: <span className="money" style={{ fontSize: "1.1rem" }}>{formatINR(a.totalAmount)}</span> },
          { k: "Payment", v: <>{label(a.paymentMode)} <PaymentBadge status={a.paymentStatus} /></> },
          ...(a.amountPaid > 0 ? [{ k: "Amount paid", v: <span className="money">{formatINR(a.amountPaid)}</span> }] : []),
          ...(a.amountRefunded > 0 ? [{ k: "Refunded", v: <span className="money">{formatINR(a.amountRefunded)}</span> }] : []),
          ...(a.cancellationReason ? [{ k: "Cancellation reason", v: a.cancellationReason }] : []),
        ]}
      />
    </div>
  );
}
