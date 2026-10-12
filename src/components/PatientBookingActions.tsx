"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client-api";
import { useToast } from "./Toaster";
import type { AppointmentDTO } from "@/types";

export function PrintButton({ label = "Print receipt" }: { label?: string }) {
  return <button className="btn btn-ghost" onClick={() => window.print()}>{label}</button>;
}

export function PatientBookingActions({ appointment, cancellation }: { appointment: AppointmentDTO; cancellation: { allowed: boolean; reason: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPay = appointment.paymentMode === "ONLINE" && ["PENDING", "FAILED"].includes(appointment.paymentStatus) && ["BOOKED", "CONFIRMED"].includes(appointment.appointmentStatus);

  async function cancel() {
    setBusy(true);
    setError(null);
    const res = await api(`/api/bookings/${appointment.id}/cancel`, { method: "POST", json: { reason } });
    setBusy(false);
    if (!res.ok) return setError(res.fieldErrors?.reason ?? res.error);
    setOpen(false);
    toast("Booking cancelled");
    router.refresh();
  }

  return (
    <div className="row no-print">
      {canPay && <Link href={`/booking/${appointment.id}/pay`} className="btn btn-teal">{appointment.paymentStatus === "FAILED" ? "Retry payment" : "Pay now"}</Link>}
      <PrintButton />
      {["BOOKED", "CONFIRMED"].includes(appointment.appointmentStatus) &&
        (cancellation.allowed ? (
          <button className="btn btn-danger" onClick={() => setOpen(true)}>Cancel booking</button>
        ) : (
          <span className="small muted" style={{ maxWidth: "40ch" }}>{cancellation.reason}</span>
        ))}
      {open && (
        <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="cancel-title" onClick={(e) => e.target === e.currentTarget && !busy && setOpen(false)}>
          <div className="dialog">
            <h3 id="cancel-title">Cancel booking {appointment.bookingReference}?</h3>
            <p className="muted">Your slot will be released for other patients.{appointment.paymentStatus === "PAID" ? " Because you’ve already paid, the branch will process your refund." : ""}</p>
            <div className="field">
              <label htmlFor="reason">Reason for cancelling</label>
              <textarea id="reason" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: can’t make it on this date" autoFocus />
              {error && <span className="error" role="alert">{error}</span>}
            </div>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={busy}>Keep booking</button>
              <button className="btn btn-danger" onClick={cancel} disabled={busy || reason.trim().length < 3}>{busy ? "Cancelling…" : "Cancel booking"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
